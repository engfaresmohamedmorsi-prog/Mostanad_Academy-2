import { authorize, jsonResponse, preflight } from "../_shared/http.ts";

const tutorInstructions = `You are the Mostanad Academy learning assistant. Help with general questions about using the academy website and teach practical document control, Aconex and EDMS workflows, project records, archiving, and Excel reporting. Answer in the student's language. Explain concepts clearly with realistic, safe project examples. Do not invent academy policies, account status, course availability, credentials, or legal advice; when an academy-specific answer is unknown, direct the user to contact the academy. Do not claim to access private course files or live website data. Keep the reply focused, useful, and under 1200 words.`;

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  try {
    const { user, service } = await authorize(request);
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 2000) return jsonResponse({ error: "Write a question of up to 2000 characters." }, 400);
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return jsonResponse({ error: "The academy tutor is not configured yet." }, 503);
    let courseId: string | null = typeof body.course_id === "string" ? body.course_id : null;
    let lessonId: string | null = typeof body.lesson_id === "string" ? body.lesson_id : null;
    const { data: profile, error: profileError } = await service.from("profiles")
      .select("role").eq("id", user.id).single();
    if (profileError || !profile) return jsonResponse({ error: "Profile not found." }, 404);
    if (lessonId) {
      const { data: lesson, error: lessonError } = await service.from("lessons")
        .select("id,course_id,title_ar,title_en,content_ar,content_en").eq("id", lessonId).single();
      if (lessonError || !lesson || (courseId && lesson.course_id !== courseId)) {
        return jsonResponse({ error: "Lesson not found." }, 404);
      }
      courseId = lesson.course_id;
    }
    if (courseId) {
      const { data: course, error: courseError } = await service.from("courses")
        .select("id,instructor_id").eq("id", courseId).single();
      if (courseError || !course) return jsonResponse({ error: "Course not found." }, 404);
      if (profile.role === "instructor" && course.instructor_id !== user.id) {
        return jsonResponse({ error: "You cannot access this course tutor." }, 403);
      }
      if (profile.role === "student") {
        const { data: enrollment, error: enrollmentError } = await service.from("enrollments")
          .select("id").eq("course_id", courseId).eq("student_id", user.id)
          .in("status", ["active", "completed"]).maybeSingle();
        if (enrollmentError || !enrollment) return jsonResponse({ error: "Enroll in this course before using its tutor." }, 403);
      }
    }
    const { data: quotaAllowed, error: quotaError } = await service.rpc("consume_assistant_quota", {
      p_user_id: user.id, p_limit: 20,
    });
    if (quotaError) {
      console.error("Tutor quota check failed:", quotaError.message);
      return jsonResponse({ error: "The tutor is temporarily unavailable." }, 503);
    }
    if (!quotaAllowed) return jsonResponse({ error: "Hourly tutor limit reached. Try again later." }, 429);

    let conversationId: string | null = typeof body.conversation_id === "string" ? body.conversation_id : null;
    if (conversationId) {
      const { data: conversation, error } = await service.from("assistant_conversations")
        .select("id,student_id,course_id,lesson_id").eq("id", conversationId).single();
      if (error || !conversation || conversation.student_id !== user.id
        || conversation.course_id !== courseId || conversation.lesson_id !== lessonId) {
        return jsonResponse({ error: "Conversation not found." }, 404);
      }
    } else {
      const { data: conversation, error } = await service.from("assistant_conversations").insert({
        student_id: user.id, course_id: courseId, lesson_id: lessonId,
      }).select("id").single();
      if (error || !conversation) {
        console.error("Could not create tutor conversation:", error?.message);
        return jsonResponse({ error: "Could not start a tutor conversation." }, 500);
      }
      conversationId = conversation.id;
    }

    const { data: previousMessages, error: historyError } = await service.from("assistant_messages")
      .select("role,content").eq("conversation_id", conversationId)
      .order("created_at", { ascending: false }).limit(10);
    if (historyError) {
      console.error("Could not read tutor history:", historyError.message);
      return jsonResponse({ error: "Could not load tutor conversation." }, 500);
    }
    const { error: userMessageError } = await service.from("assistant_messages").insert({
      conversation_id: conversationId, role: "user", content: message,
    });
    if (userMessageError) {
      console.error("Could not save tutor question:", userMessageError.message);
      return jsonResponse({ error: "Could not save the tutor question." }, 500);
    }
    const history = (previousMessages || []).reverse().map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    }));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: tutorInstructions }] },
        contents: [...history, { role: "user", parts: [{ text: message }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1400 },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Gemini request failed:", result.error?.message || response.status);
      return jsonResponse({ error: "The tutor could not answer right now. Try again later." }, 502);
    }
    const reply = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (!reply) return jsonResponse({ error: "The tutor returned an empty answer. Please try again." }, 502);
    const { error: assistantMessageError } = await service.from("assistant_messages").insert({
      conversation_id: conversationId, role: "assistant", content: reply.slice(0, 6000),
    });
    if (assistantMessageError) {
      console.error("Could not save tutor response:", assistantMessageError.message);
      return jsonResponse({ error: "The tutor reply could not be saved." }, 500);
    }
    return jsonResponse({ reply: reply.slice(0, 6000), conversation_id: conversationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    console.error("tutor request failed:", message);
    return jsonResponse({ error: message }, message === "Authentication required." ? 401 : 500);
  }
});

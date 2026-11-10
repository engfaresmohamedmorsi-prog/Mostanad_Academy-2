import { authorize, jsonResponse, preflight } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  try {
    const { user, service } = await authorize(request);
    const body = await request.json();
    if (body.action !== "set-answer" || typeof body.quiz_id !== "string" || typeof body.question_id !== "string") {
      return jsonResponse({ error: "Invalid quiz answer request." }, 400);
    }
    if (!Number.isInteger(body.correct_option) || body.correct_option < 0 || body.correct_option > 5) {
      return jsonResponse({ error: "Invalid correct answer." }, 400);
    }
    const { data: profile, error: profileError } = await service.from("profiles")
      .select("role").eq("id", user.id).single();
    if (profileError || !profile || !["instructor", "admin"].includes(profile.role)) {
      return jsonResponse({ error: "Instructor access is required." }, 403);
    }
    const { data: question, error: questionError } = await service.from("quiz_questions")
      .select("id,quiz_id,options_ar").eq("id", body.question_id).eq("quiz_id", body.quiz_id).single();
    if (questionError || !question) return jsonResponse({ error: "Quiz question not found." }, 404);
    if (body.correct_option >= question.options_ar.length) {
      return jsonResponse({ error: "Correct answer index is outside the available options." }, 400);
    }
    const { data: quiz, error: quizError } = await service.from("quizzes")
      .select("id,lesson_id").eq("id", body.quiz_id).single();
    if (quizError || !quiz) return jsonResponse({ error: "Quiz not found." }, 404);
    const { data: lesson, error: lessonError } = await service.from("lessons")
      .select("course_id").eq("id", quiz.lesson_id).single();
    if (lessonError || !lesson) return jsonResponse({ error: "Lesson not found." }, 404);
    const { data: course, error: courseError } = await service.from("courses")
      .select("instructor_id").eq("id", lesson.course_id).single();
    if (courseError || !course || (profile.role !== "admin" && course.instructor_id !== user.id)) {
      return jsonResponse({ error: "You cannot manage this course quiz." }, 403);
    }
    const { error } = await service.from("quiz_answers").upsert({
      question_id: question.id,
      correct_option: body.correct_option,
    });
    if (error) {
      console.error("Could not save quiz answer:", error.message);
      return jsonResponse({ error: "Could not save the quiz answer." }, 500);
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    console.error("quiz-admin request failed:", message);
    return jsonResponse({ error: message }, message === "Authentication required." ? 401 : 500);
  }
});

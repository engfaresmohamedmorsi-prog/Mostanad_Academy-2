import { authorize, jsonResponse, preflight } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  try {
    const { user, service } = await authorize(request);
    const body = await request.json();
    if (typeof body.course_id !== "string") return jsonResponse({ error: "A course is required." }, 400);
    const { data: profile, error: profileError } = await service.from("profiles")
      .select("role,full_name").eq("id", user.id).single();
    if (profileError || !profile || profile.role !== "student") {
      return jsonResponse({ error: "Only enrolled students can receive certificates." }, 403);
    }
    const { data: enrollment, error: enrollmentError } = await service.from("enrollments")
      .select("id").eq("course_id", body.course_id).eq("student_id", user.id)
      .in("status", ["active", "completed"]).maybeSingle();
    if (enrollmentError || !enrollment) return jsonResponse({ error: "Enroll in this course first." }, 403);
    const { data: course, error: courseError } = await service.from("courses")
      .select("id,title_ar,title_en").eq("id", body.course_id).single();
    if (courseError || !course) return jsonResponse({ error: "Course not found." }, 404);
    const { data: lessons, error: lessonsError } = await service.from("lessons")
      .select("id").eq("course_id", course.id);
    if (lessonsError || !lessons?.length) return jsonResponse({ error: "This course has no lessons to certify." }, 409);
    const lessonIds = lessons.map((lesson) => lesson.id);
    const { data: quizzes, error: quizzesError } = await service.from("quizzes")
      .select("id,lesson_id").in("lesson_id", lessonIds);
    if (quizzesError) {
      console.error("Could not check course quizzes:", quizzesError.message);
      return jsonResponse({ error: "Could not verify course quizzes." }, 500);
    }
    if (!quizzes || quizzes.length !== lessons.length) {
      return jsonResponse({ error: "A quiz must be configured for every course lesson before a certificate can be issued." }, 409);
    }
    const { data: passedAttempts, error: attemptsError } = await service.from("quiz_attempts")
      .select("quiz_id").eq("student_id", user.id).eq("passed", true)
      .in("quiz_id", quizzes.map((quiz) => quiz.id));
    if (attemptsError) {
      console.error("Could not verify passed course quizzes:", attemptsError.message);
      return jsonResponse({ error: "Could not verify course quiz results." }, 500);
    }
    if (new Set((passedAttempts || []).map((attempt) => attempt.quiz_id)).size !== quizzes.length) {
      return jsonResponse({ error: "Pass every course quiz before requesting a certificate." }, 409);
    }
    let { data: certificate, error: certificateError } = await service.from("certificates")
      .insert({ course_id: course.id, student_id: user.id })
      .select("certificate_code,issued_at").single();
    if (certificateError?.code === "23505") {
      const existing = await service.from("certificates").select("certificate_code,issued_at")
        .eq("course_id", course.id).eq("student_id", user.id).single();
      certificate = existing.data;
      certificateError = existing.error;
    }
    if (certificateError || !certificate) {
      console.error("Could not issue certificate:", certificateError?.message);
      return jsonResponse({ error: "The certificate could not be issued." }, 500);
    }
    return jsonResponse({
      ...certificate,
      student_name: profile.full_name || user.email || "Student",
      course_title_ar: course.title_ar,
      course_title_en: course.title_en,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    console.error("certificate-issue request failed:", message);
    return jsonResponse({ error: message }, message === "Authentication required." ? 401 : 500);
  }
});

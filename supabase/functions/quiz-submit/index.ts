import { authorize, jsonResponse, preflight } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  try {
    const { user, service } = await authorize(request);
    const body = await request.json();
    if (typeof body.quiz_id !== "string" || !Array.isArray(body.answers) || body.answers.length < 1 || body.answers.length > 100) {
      return jsonResponse({ error: "Invalid quiz submission." }, 400);
    }
    const { data: quiz, error: quizError } = await service.from("quizzes")
      .select("id,lesson_id,passing_percent").eq("id", body.quiz_id).single();
    if (quizError || !quiz) return jsonResponse({ error: "Quiz not found." }, 404);
    const { data: lesson, error: lessonError } = await service.from("lessons")
      .select("course_id").eq("id", quiz.lesson_id).single();
    if (lessonError || !lesson) return jsonResponse({ error: "Lesson not found." }, 404);
    const { data: profile, error: profileError } = await service.from("profiles")
      .select("role").eq("id", user.id).single();
    if (profileError || !profile) return jsonResponse({ error: "Profile not found." }, 404);
    if (profile.role !== "student") return jsonResponse({ error: "Only enrolled students can submit quizzes." }, 403);
    const { data: enrollment, error: enrollmentError } = await service.from("enrollments")
      .select("id").eq("course_id", lesson.course_id).eq("student_id", user.id)
      .in("status", ["active", "completed"]).maybeSingle();
    if (enrollmentError || !enrollment) return jsonResponse({ error: "Enroll in this course before submitting its quiz." }, 403);
    const { data: questions, error: questionsError } = await service.from("quiz_questions")
      .select("id,options_ar").eq("quiz_id", quiz.id).order("position");
    if (questionsError || !questions?.length) return jsonResponse({ error: "Quiz has no questions." }, 400);
    const submitted = new Map<string, number>();
    for (const answer of body.answers) {
      if (typeof answer?.question_id !== "string" || !Number.isInteger(answer.option_index) || submitted.has(answer.question_id)) {
        return jsonResponse({ error: "Invalid or duplicate answer." }, 400);
      }
      submitted.set(answer.question_id, answer.option_index);
    }
    if (submitted.size !== questions.length || questions.some((question) => !submitted.has(question.id))) {
      return jsonResponse({ error: "Answer every question before submitting." }, 400);
    }
    if (questions.some((question) => submitted.get(question.id)! < 0 || submitted.get(question.id)! >= question.options_ar.length)) {
      return jsonResponse({ error: "An answer is outside the available options." }, 400);
    }
    const { data: answerKey, error: keyError } = await service.from("quiz_answers")
      .select("question_id,correct_option").in("question_id", questions.map((question) => question.id));
    if (keyError || answerKey?.length !== questions.length) {
      console.error("Quiz answer key is incomplete:", keyError?.message || "Missing answers.");
      return jsonResponse({ error: "This quiz is not fully configured yet." }, 409);
    }
    const key = new Map(answerKey.map((answer) => [answer.question_id, answer.correct_option]));
    const correct = questions.reduce((total, question) => total + Number(submitted.get(question.id) === key.get(question.id)), 0);
    const scorePercent = Math.round(correct * 100 / questions.length);
    const passed = scorePercent >= quiz.passing_percent;
    const { error: attemptError } = await service.from("quiz_attempts").insert({
      quiz_id: quiz.id, student_id: user.id, score_percent: scorePercent, passed,
    });
    if (attemptError) {
      console.error("Could not save quiz attempt:", attemptError.message);
      return jsonResponse({ error: "Quiz results could not be saved." }, 500);
    }
    if (passed) {
      const { error: progressError } = await service.from("lesson_progress").upsert({
        student_id: user.id,
        lesson_id: quiz.lesson_id,
        verified_by_quiz: true,
      }, { onConflict: "student_id,lesson_id" });
      if (progressError) {
        console.error("Could not record quiz-verified lesson completion:", progressError.message);
        return jsonResponse({ error: "Your result was saved, but lesson progress could not be updated." }, 500);
      }
    }
    return jsonResponse({ score_percent: scorePercent, passed, lesson_id: quiz.lesson_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    console.error("quiz-submit request failed:", message);
    return jsonResponse({ error: message }, message === "Authentication required." ? 401 : 500);
  }
});

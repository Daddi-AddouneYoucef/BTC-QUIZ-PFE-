import { generatePedagogicalFeedback } from "./ai-service.ts";
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono().basePath("/server");

// Lazy initialization of Supabase client
let supabaseInstance: any = null;
function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return supabaseInstance;
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/signup", async (c) => {
  try {
    const supabase = getSupabase();
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      console.log('Sign up validation error: Missing required fields');
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });
    
    if (error) {
      console.log(`Sign up error for ${email}: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }
    
    // Store user profile in database
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: name,
          quizzes_taken: 0,
          total_score: 0,
        });
      
      if (profileError) {
        console.log(`Error creating user profile: ${profileError.message}`);
      } else {
        console.log(`User profile created in database for: ${email}`);
      }
    }
    
    console.log(`User created successfully: ${email}`);
    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Sign up exception: ${error}`);
    return c.json({ error: 'Sign up failed' }, 500);
  }
});

// Get user profile (requires auth)
app.get("/profile", async (c) => {
  try {
    const supabase = getSupabase();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id || authError) {
      console.log('Authorization error while retrieving profile');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      // Create profile if it doesn't exist
      const newProfile = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || 'User',
        quizzes_taken: 0,
        total_score: 0,
      };
      
      const { data: insertedProfile, error: insertError } = await supabase
        .from('users')
        .insert(newProfile)
        .select()
        .single();
      
      if (insertError) {
        console.log(`Error creating profile: ${insertError.message}`);
        return c.json({ error: `Failed to create profile: ${insertError.message}` }, 500);
      }
      
      console.log(`Created missing profile for user ${user.id}`);
      return c.json({ 
        profile: {
          ...insertedProfile,
          createdAt: new Date(insertedProfile.created_at).getTime(),
          quizzesTaken: insertedProfile.quizzes_taken,
          totalScore: insertedProfile.total_score,
        }
      });
    }
    
    console.log(`Retrieved profile for user ${user.id}`);
    return c.json({ 
      profile: {
        ...profile,
        createdAt: new Date(profile.created_at).getTime(),
        quizzesTaken: profile.quizzes_taken,
        totalScore: profile.total_score,
      }
    });
  } catch (error) {
    console.log(`Error retrieving profile: ${error}`);
    return c.json({ error: `Failed to retrieve profile: ${error}` }, 500);
  }
});

// Update user profile (requires auth)
app.put("/profile", async (c) => {
  try {
    const supabase = getSupabase();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id || authError) {
      console.log('Authorization error while updating profile');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { name } = await c.req.json();
    
    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    
    if (updateError) {
      console.log(`Error updating profile: ${updateError.message}`);
      return c.json({ error: `Failed to update profile: ${updateError.message}` }, 500);
    }
    
    // Also update user metadata in Supabase Auth
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { name }
    });
    
    console.log(`Profile updated for user ${user.id}`);
    return c.json({ 
      profile: {
        ...updatedProfile,
        createdAt: new Date(updatedProfile.created_at).getTime(),
        quizzesTaken: updatedProfile.quizzes_taken,
        totalScore: updatedProfile.total_score,
      }
    });
  } catch (error) {
    console.log(`Error updating profile: ${error}`);
    return c.json({ error: `Failed to update profile: ${error}` }, 500);
  }
});

// Get quizzes endpoint
app.get("/quizzes", async (c) => {
  try {
    const supabase = getSupabase();
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log(`Error retrieving quizzes: ${error.message}`);
      return c.json({ error: `Failed to retrieve quizzes: ${error.message}` }, 500);
    }
    
    console.log(`Retrieved ${quizzes?.length || 0} quizzes`);
    return c.json({ quizzes: quizzes || [] });
  } catch (error) {
    console.log(`Error retrieving quizzes: ${error}`);
    return c.json({ error: `Failed to retrieve quizzes: ${error}` }, 500);
  }
});

// Get quiz by ID with questions
app.get("/quizzes/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param('id');
    
    // Get quiz metadata
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (quizError || !quiz) {
      console.log(`Quiz not found: ${id}`);
      return c.json({ error: 'Quiz not found' }, 404);
    }
    
    // Get questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', id)
      .order('order_index', { ascending: true });
    
    if (questionsError) {
      console.log(`Error retrieving questions: ${questionsError.message}`);
      return c.json({ error: `Failed to retrieve questions: ${questionsError.message}` }, 500);
    }
    
    // Format questions to match frontend expectations
    const formattedQuestions = questions?.map(q => ({
      question: q.question_text,
      options: q.options,
      correctAnswer: q.correct_answer,
    })) || [];
    
    console.log(`Retrieved quiz: ${id} with ${formattedQuestions.length} questions`);
    return c.json({ 
      quiz: {
        ...quiz,
        questions: formattedQuestions,
      }
    });
  } catch (error) {
    console.log(`Error retrieving quiz: ${error}`);
    return c.json({ error: `Failed to retrieve quiz: ${error}` }, 500);
  }
});

// Initialize quizzes with seed data (idempotent)
app.post("/init-quizzes", async (c) => {
  try {
    const supabase = getSupabase();
    
    // Check if quizzes already exist
    const { data: existing, error: checkError } = await supabase
      .from('quizzes')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.log(`Error checking quizzes: ${checkError.message}`);
      return c.json({ error: `Failed to check quizzes: ${checkError.message}` }, 500);
    }
    
    if (existing && existing.length > 0) {
      console.log('Quizzes already initialized');
      return c.json({ message: 'Quizzes already initialized', initialized: false });
    }
    
    // Seed quiz data
    const quizzes = [
      {
        id: 'javascript-basics',
        title: 'JavaScript Basics',
        description: 'Test your knowledge of JavaScript fundamentals',
        category: 'Programming',
        difficulty: 'Beginner',
      },
      {
        id: 'web-development',
        title: 'Web Development Fundamentals',
        description: 'Test your HTML, CSS, and web development knowledge',
        category: 'Web Development',
        difficulty: 'Intermediate',
      },
      {
        id: 'react-fundamentals',
        title: 'React Fundamentals',
        description: 'Test your knowledge of React concepts and patterns',
        category: 'Frontend Frameworks',
        difficulty: 'Intermediate',
      },
    ];
    
    const { error: quizInsertError } = await supabase
      .from('quizzes')
      .insert(quizzes);
    
    if (quizInsertError) {
      console.log(`Error inserting quizzes: ${quizInsertError.message}`);
      return c.json({ error: `Failed to insert quizzes: ${quizInsertError.message}` }, 500);
    }
    
    // Seed questions
    const questions = [
      // JavaScript Basics
      { quiz_id: 'javascript-basics', question_text: 'What is the correct way to declare a variable in JavaScript?', options: ['var x = 5;', 'variable x = 5;', 'v x = 5;', 'dim x = 5;'], correct_answer: 0, order_index: 1 },
      { quiz_id: 'javascript-basics', question_text: 'Which operator is used for strict equality comparison?', options: ['==', '===', '=', '!='], correct_answer: 1, order_index: 2 },
      { quiz_id: 'javascript-basics', question_text: 'What does DOM stand for?', options: ['Document Object Model', 'Data Object Model', 'Document Oriented Model', 'Digital Object Management'], correct_answer: 0, order_index: 3 },
      { quiz_id: 'javascript-basics', question_text: 'Which method is used to add an element at the end of an array?', options: ['push()', 'pop()', 'shift()', 'unshift()'], correct_answer: 0, order_index: 4 },
      { quiz_id: 'javascript-basics', question_text: 'What is the output of: typeof null?', options: ['null', 'undefined', 'object', 'number'], correct_answer: 2, order_index: 5 },
      // Web Development
      { quiz_id: 'web-development', question_text: 'Which HTML tag is used for creating a hyperlink?', options: ['<link>', '<a>', '<href>', '<url>'], correct_answer: 1, order_index: 1 },
      { quiz_id: 'web-development', question_text: 'What does CSS stand for?', options: ['Computer Style Sheets', 'Cascading Style Sheets', 'Creative Style System', 'Colorful Style Sheets'], correct_answer: 1, order_index: 2 },
      { quiz_id: 'web-development', question_text: 'Which CSS property is used to change text color?', options: ['text-color', 'font-color', 'color', 'foreground-color'], correct_answer: 2, order_index: 3 },
      { quiz_id: 'web-development', question_text: 'What is the correct HTML for adding a background color?', options: ['<body bg="yellow">', '<body style="background-color:yellow;">', '<background>yellow</background>', '<body color="yellow">'], correct_answer: 1, order_index: 4 },
      { quiz_id: 'web-development', question_text: 'Which HTTP method is used to submit form data?', options: ['GET', 'POST', 'PUT', 'SUBMIT'], correct_answer: 1, order_index: 5 },
      // React Fundamentals
      { quiz_id: 'react-fundamentals', question_text: 'What is JSX?', options: ['JavaScript XML', 'Java Syntax Extension', 'JSON XML', 'JavaScript Extension'], correct_answer: 0, order_index: 1 },
      { quiz_id: 'react-fundamentals', question_text: 'Which hook is used to manage state in functional components?', options: ['useEffect', 'useState', 'useContext', 'useReducer'], correct_answer: 1, order_index: 2 },
      { quiz_id: 'react-fundamentals', question_text: 'What is the purpose of useEffect hook?', options: ['To create side effects', 'To manage state', 'To create context', 'To optimize performance'], correct_answer: 0, order_index: 3 },
      { quiz_id: 'react-fundamentals', question_text: 'How do you pass data from parent to child component?', options: ['Through props', 'Through state', 'Through events', 'Through refs'], correct_answer: 0, order_index: 4 },
      { quiz_id: 'react-fundamentals', question_text: 'What is the virtual DOM?', options: ['A programming concept', 'A lightweight copy of the real DOM', 'A database', 'A testing framework'], correct_answer: 1, order_index: 5 },
    ];
    
    const { error: questionsInsertError } = await supabase
      .from('questions')
      .insert(questions);
    
    if (questionsInsertError) {
      console.log(`Error inserting questions: ${questionsInsertError.message}`);
      return c.json({ error: `Failed to insert questions: ${questionsInsertError.message}` }, 500);
    }
    
    console.log('Quizzes initialized successfully with seed data');
    return c.json({ message: 'Quizzes initialized successfully', initialized: true });
  } catch (error) {
    console.log(`Error initializing quizzes: ${error}`);
    return c.json({ error: `Failed to initialize quizzes: ${error}` }, 500);
  }
});

// Submit quiz result (requires auth)
// NOTE: Only saves the score — does NOT call AI (use /ai-feedback for that).
app.post("/results", async (c) => {
  try {
    const supabase = getSupabase();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (!user?.id || authError) {
      console.log('Authorization error while submitting quiz result');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { quizId, score, totalQuestions, answers } = await c.req.json();

    if (quizId === undefined || score === undefined || totalQuestions === undefined) {
      return c.json({ error: 'quizId, score and totalQuestions are required' }, 400);
    }

    const { data: attempt, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        total_questions: totalQuestions,
        answers: answers ?? [],
      })
      .select()
      .single();

    if (insertError) {
      console.log(`Error saving quiz attempt: ${insertError.message}`);
      return c.json({ error: `Failed to save result: ${insertError.message}` }, 500);
    }

    console.log(`Quiz result saved for user ${user.id}: ${score}/${totalQuestions} (attempt ${attempt.id})`);
    return c.json({ success: true, attemptId: attempt.id });
  } catch (error) {
    console.log(`Error saving quiz result: ${error}`);
    return c.json({ error: `Failed to save result: ${error}` }, 500);
  }
});

// ─── AI Feedback endpoint ─────────────────────────────────────────────────────
// POST /ai-feedback
// Body: { quizTitle, questions, answers, score }
// Calls Gemini and returns structured per-question corrections.
app.post("/ai-feedback", async (c) => {
  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    // ── API key guard ────────────────────────────────────────────────────────
    if (!geminiKey) {
      console.log('[AI Feedback] GEMINI_API_KEY not configured');
      return c.json({ error: 'AI service not configured — add GEMINI_API_KEY secret' }, 503);
    }

    // ── Payload ───────────────────────────────────────────────────────────────
    const body = await c.req.json();
    const { quizTitle, questions, answers, score } = body;

    if (!questions?.length || !answers || score === undefined) {
      return c.json({ error: 'questions, answers and score are required' }, 400);
    }

    console.log(`[AI Feedback] Generating feedback for "${quizTitle}" score=${score}/${questions.length}`);

    // ── Generate feedback ─────────────────────────────────────────────────────
    const { feedback, error: aiError, quotaExceeded, retryAfterSeconds } = await generatePedagogicalFeedback(
      questions,
      answers,
      score,
      geminiKey,
      quizTitle ?? 'Quiz',
    );

    if (!feedback) {
      const reason = aiError ?? 'Unknown AI error';
      console.log(`[AI Feedback] Generation failed: ${reason}`);
      if (quotaExceeded) {
        return c.json({ error: 'quota_exceeded', retryAfterSeconds: retryAfterSeconds ?? 60 }, 429);
      }
      return c.json({ error: `AI feedback generation failed: ${reason}` }, 502);
    }

    console.log(`[AI Feedback] Success — ${feedback.analyses.length} analyses`);
    return c.json({ feedback });
  } catch (error) {
    console.log(`[AI Feedback] Exception: ${error}`);
    return c.json({ error: `AI feedback failed: ${error}` }, 500);
  }
});

// Get user results (requires auth)
app.get("/results", async (c) => {
  try {
    const supabase = getSupabase();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id || authError) {
      console.log('Authorization error while retrieving results');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });
    
    if (error) {
      console.log(`Error retrieving results: ${error.message}`);
      return c.json({ error: `Failed to retrieve results: ${error.message}` }, 500);
    }
    
    // Format results to match frontend expectations
    const formattedResults = attempts?.map(attempt => ({
      userId: attempt.user_id,
      quizId: attempt.quiz_id,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      timestamp: new Date(attempt.completed_at).getTime(),
      aiFeedback: attempt.ai_feedback,
      answers: attempt.answers,
    })) || [];
    
    console.log(`Retrieved ${formattedResults.length} results for user ${user.id}`);
    return c.json({ results: formattedResults });
  } catch (error) {
    console.log(`Error retrieving user results: ${error}`);
    return c.json({ error: `Failed to retrieve results: ${error}` }, 500);
  }
});

// Get leaderboard (with fallback if RPC not available)
app.get("/leaderboard", async (c) => {
  try {
    const supabase = getSupabase();

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_leaderboard', { limit_count: 10 });
    
    if (!rpcError && rpcData) {
      const formattedLeaderboard = rpcData.map((entry: any) => ({
        rank: Number(entry.rank),
        name: entry.name,
        email: entry.email,
        quizzesTaken: entry.quizzes_taken,
        totalScore: entry.total_score,
        averageScore: Number(entry.average_score),
      }));
      
      console.log(`Retrieved leaderboard via RPC with ${formattedLeaderboard.length} users`);
      return c.json({ leaderboard: formattedLeaderboard });
    }
    
    // Fallback: direct query
    console.log(`RPC failed (${rpcError?.message}), using direct query fallback`);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, quizzes_taken, total_score')
      .gt('quizzes_taken', 0)
      .order('total_score', { ascending: false })
      .limit(10);
    
    if (usersError) {
      console.log(`Error retrieving leaderboard via fallback: ${usersError.message}`);
      return c.json({ error: `Failed to retrieve leaderboard: ${usersError.message}` }, 500);
    }
    
    const formattedLeaderboard = (users || []).map((user: any, index: number) => ({
      rank: index + 1,
      name: user.name,
      email: user.email,
      quizzesTaken: user.quizzes_taken,
      totalScore: user.total_score,
      averageScore: user.quizzes_taken > 0 ? Math.round((user.total_score / user.quizzes_taken) * 100) / 100 : 0,
    }));
    
    console.log(`Retrieved leaderboard via fallback with ${formattedLeaderboard.length} users`);
    return c.json({ leaderboard: formattedLeaderboard });
  } catch (error) {
    console.log(`Error retrieving leaderboard: ${error}`);
    return c.json({ error: `Failed to retrieve leaderboard: ${error}` }, 500);
  }
});

Deno.serve(app.fetch);
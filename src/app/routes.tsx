import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import QuizList from "./components/QuizList";
import QuizTake from "./components/QuizTake";
import Results from "./components/Results";
import Profile from "./components/Profile";
import Leaderboard from "./components/Leaderboard";
import NotFound from "./components/NotFound";
import AdminPanel from "./components/AdminPanel";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { path: "quizzes", Component: QuizList },
      { path: "quiz/:id", Component: QuizTake },
      { path: "results", Component: Results },
      { path: "profile", Component: Profile },
      { path: "leaderboard", Component: Leaderboard },
      { path: "admin", Component: AdminPanel },
      { path: "*", Component: NotFound },
    ],
  },
]);

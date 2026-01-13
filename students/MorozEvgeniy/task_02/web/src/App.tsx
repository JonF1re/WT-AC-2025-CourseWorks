import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Recipes from "./pages/Recipes";
import RecipeDetails from "./pages/RecipeDetails";
import RecipeCreate from "./pages/RecipeCreate";
import MealPlan from "./pages/MealPlan";
import Shopping from "./pages/Shopping";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Recipes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recipes/new"
          element={
            <ProtectedRoute>
              <RecipeCreate />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recipes/:id"
          element={
            <ProtectedRoute>
              <RecipeDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mealplan"
          element={
            <ProtectedRoute>
              <MealPlan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shopping"
          element={
            <ProtectedRoute>
              <Shopping />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

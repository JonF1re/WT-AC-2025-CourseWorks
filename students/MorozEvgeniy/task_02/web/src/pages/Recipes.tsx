import { useEffect, useState } from "react";
import { recipesApi } from "../shared/api/recipes.api";
import type { Recipe } from "../shared/api/recipes.api";
import { Link } from "react-router-dom";
import { Page } from "../shared/layout/Page";

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    recipesApi
      .getAll()
      .then((res) => {
        setRecipes(res.data.data);
      })
      .catch(() => {
        setError("Не удалось загрузить рецепты");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <Page>
        <p className="loading">Загрузка…</p>
      </Page>
    );

  if (error)
    return (
      <Page>
        <div className="error">{error}</div>
      </Page>
    );

  return (
    <Page>
      {/* ===== HEADER ===== */}
      <div className="recipes-header">
        <h1>Рецепты</h1>

        <div className="recipes-actions">
          <Link to="/recipes/new">
            <button>➕ Рецепт</button>
          </Link>

          <Link to="/mealplan">
            <button>📅 План</button>
          </Link>

          <Link to="/shopping">
            <button>🛒 Покупки</button>
          </Link>
        </div>
      </div>

      {/* ===== LIST ===== */}
      {recipes.length === 0 ? (
        <p className="empty">Рецептов пока нет</p>
      ) : (
        <div className="recipes-grid">
          {recipes.map((r) => (
            <Link
              key={r.id}
              to={`/recipes/${r.id}`}
              className="card recipe-card"
            >
              <h3>{r.title}</h3>

              {r.description && (
                <p className="muted">{r.description}</p>
              )}

              <div className="meta">
                ⏱ {r.prepTime} мин · 🍽 {r.servings}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

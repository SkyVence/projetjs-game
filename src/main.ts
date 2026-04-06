import { gameDataService } from "@/data";
import { LoadingScreen, ErrorScreen } from "@/components";
import { MenuRoute, cleanupMenuRoute } from "./routes/menuRoute";
import { createGameRoute, cleanupGameRoute } from "./routes/gameRoute";
import { CreditsRoute } from "./routes/creditsRoute";
import { SettingsRoute } from "./routes/settingsRoute";
import { ExitRoute } from "./routes/exitRoute";
import { startRouter, registerRoutes } from "./router";
import { Logger, SystemName } from "./utils/logger";

const logger = new Logger();

const routes = {
  "/": MenuRoute,
  "/game": createGameRoute,
  "/credits": CreditsRoute,
  "/settings": SettingsRoute,
  "/exit": ExitRoute,
};

const cleanups: Record<string, () => void> = {
  "/game": cleanupGameRoute,
  "/": cleanupMenuRoute,
};

async function initializeApp(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) {
    logger.error(SystemName.Game, "App element not found");
    return;
  }

  // Show loading screen immediately
  app.innerHTML = "";
  app.appendChild(LoadingScreen());

  try {
    // Initialize database connection
    await gameDataService.init();
    logger.log(SystemName.Database, "Game data service initialized");

    // Success - start the router
    registerRoutes(routes, cleanups);
    startRouter(app);
  } catch (error) {
    // Show error screen with retry button
    logger.error(SystemName.Database, "Failed to initialize app", error);

    app.innerHTML = "";
    app.appendChild(
      ErrorScreen({
        message: "Failed to initialize database. Please check your browser permissions and try again.",
        onRetry: () => {
          gameDataService.clearError();
          initializeApp();
        },
      })
    );
  }
}

// Start the application
initializeApp();

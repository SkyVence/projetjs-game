import { Router } from "@/router/class/router";
import { LevelView } from "@/router/examples/";

const router = new Router(
  [
    { path: /^\/(?:$|level\/(?<id>\d+)$)/, view: LevelView },
  ],
  "#app"
);

router.enableLinks();

if (location.pathname === "/") {
  history.replaceState(null, "", "/level/1");
}

router.handleLocation();

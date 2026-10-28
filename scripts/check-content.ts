// npm run content:check — validates every JSON file in app/content.
import { validateContent } from "../app/content/validate";

try {
  validateContent();
  console.log("Content OK");
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}

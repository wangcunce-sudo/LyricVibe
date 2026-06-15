/**
 * Remotion entry point — register the composition for rendering.
 *
 * Run: npx remotion studio src/lib/remotion/index.ts
 * Render: npx remotion render LyricVibeVideo out.mp4 --props='{"lyrics":[...]}'
 */

import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);

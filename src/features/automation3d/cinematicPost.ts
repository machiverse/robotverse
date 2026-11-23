// The post-processing passes the 3D sim uses for its realistic picture: ambient occlusion,
// glow on lamps and arcs, and a lens vignette. Kept here so the Studio and the Builder share one list.
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";

export const CINEMATIC_POST = { EffectComposer, RenderPass, GTAOPass, UnrealBloomPass, OutputPass, ShaderPass, VignetteShader };

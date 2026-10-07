/**
 * Documentation of the PLC program the simulator runs, in the form an
 * integrator would hand over: I/O list, interlocks, alarms and the main
 * sequence in IEC 61131-3 Structured Text. Kept in step with engine.ts.
 */

export const IO_LIST: { tag: string; type: "DI" | "DO" | "AI" | "AO"; device: string; note: string }[] = [
  { tag: "I_EStop_OK", type: "DI", device: "E-stop chain (dual channel, safety relay)", note: "NC; 0 = pressed → category 0 stop" },
  { tag: "I_Gate_Closed", type: "DI", device: "Interlocked safety gate switch", note: "0 = open → category 1 stop" },
  { tag: "I_SafetyRelay_OK", type: "DI", device: "Safety relay feedback", note: "Needs Reset after any trip" },
  { tag: "I_Silo_Low", type: "DI", device: "Silo level switch", note: "< 5 % dry mix" },
  { tag: "I_Hopper_LSH", type: "DI", device: "Hopper level switch high", note: "≥ 190 L" },
  { tag: "I_Hopper_LSL", type: "DI", device: "Hopper level switch low", note: "≤ 50 L – warning, call a batch" },
  { tag: "I_Hopper_LSLL", type: "DI", device: "Hopper level switch low-low", note: "≤ 12 L – hold print, pump interlocked" },
  { tag: "I_Mixer_FB", type: "DI", device: "Mixer motor contactor feedback", note: "Checked within 2 s of run command" },
  { tag: "I_Pump_FB", type: "DI", device: "Pump motor run feedback", note: "Loss for 2 s → pump failure" },
  { tag: "I_Drive_OK", type: "DI", device: "Gantry servo drives ready", note: "Following error < 5 mm" },
  { tag: "AI_Pressure", type: "AI", device: "Line pressure transmitter 0–40 bar", note: "H 22 bar slow-down · HH 28 bar trip" },
  { tag: "AI_Flow", type: "AI", device: "Magnetic flow meter 0–20 L/min", note: "Closed-loop flow trim" },
  { tag: "AI_Nozzle_Height", type: "AI", device: "Laser distance sensor at the nozzle", note: "Stand-off to the layer below, mm" },
  { tag: "AI_Axis_X/Y/Z", type: "AI", device: "Servo encoders", note: "Actual position, mm" },
  { tag: "Q_Axis_Enable", type: "DO", device: "Servo enable (STO released)", note: "Only with safety relay OK" },
  { tag: "Q_Mixer_Run", type: "DO", device: "Mixer motor contactor", note: "Kept running on faults to stop concrete setting" },
  { tag: "Q_Pump_Run", type: "DO", device: "Pump motor contactor / VFD run", note: "Interlocked – see matrix" },
  { tag: "AO_Pump_Speed", type: "AO", device: "Pump VFD speed reference 0–100 %", note: "Feed-forward from bead area × speed" },
  { tag: "Q_Nozzle_Valve", type: "DO", device: "Pinch valve at the nozzle", note: "Needs pump feedback" },
  { tag: "Q_Recirc_Valve", type: "DO", device: "Recirculation valve to hopper", note: "Open whenever the nozzle is shut" },
  { tag: "Q_Beacon_R/A/G", type: "DO", device: "Stack light", note: "Red fault · amber hold/manual · green auto run" },
  { tag: "Q_Horn", type: "DO", device: "Alarm horn", note: "Unacknowledged fault" },
];

export const INTERLOCKS: { output: string; permissive: string[] }[] = [
  { output: "Q_Axis_Enable", permissive: ["Safety relay OK", "Drives OK (following error < 5 mm)"] },
  { output: "Q_Pump_Run", permissive: ["Safety relay OK", "Pressure < 28 bar (HH)", "Hopper above low-low (auto)", "No latched pump fault", "Nozzle or recirculation path open"] },
  { output: "Q_Nozzle_Valve", permissive: ["Pump run feedback"] },
  { output: "Q_Recirc_Valve", permissive: ["Forced open when the nozzle is shut and the pump runs (no dead-heading)"] },
  { output: "Printing (step 50)", permissive: ["Axes homed", "Hose primed (3–22 bar, flow > 2 L/min for 3 s)", "Height sensor alive", "Gate closed"] },
  { output: "Manual jog / pump", permissive: ["MANUAL mode", "Same safety permissives", "Reduced speed 150 mm/s"] },
];

export const ALARMS: { id: string; text: string; severity: "fault" | "warning" | "info"; reaction: string; recovery: string }[] = [
  { id: "ESTOP", text: "Emergency stop", severity: "fault", reaction: "Category 0: all outputs off", recovery: "Release, Reset, Start to resume" },
  { id: "GATE_RUN", text: "Safety gate opened in operation", severity: "fault", reaction: "Category 1: decelerate, then outputs off", recovery: "Close gate, Reset, Start" },
  { id: "P_HH", text: "Excessive pressure (≥ 28 bar)", severity: "fault", reaction: "Pump stop, nozzle shut, recirculation opens", recovery: "Clear blockage, Reset, Start (resumes in place)" },
  { id: "P_H", text: "Pressure high (> 22 bar)", severity: "warning", reaction: "Print speed reduced automatically", recovery: "Automatic when pressure falls" },
  { id: "PUMP_FAIL", text: "Pump failure (no run feedback)", severity: "fault", reaction: "Safe stop", recovery: "One automatic restart; then operator repair + Reset" },
  { id: "POS_ERR", text: "Positioning error (following error ≥ 5 mm)", severity: "fault", reaction: "Safe stop", recovery: "Fix drive, Reset, re-home, Start" },
  { id: "H_SENS", text: "Nozzle height sensor signal lost", severity: "fault", reaction: "Safe stop", recovery: "Fix sensor, Reset, Start" },
  { id: "H_DEV", text: "Nozzle height out of tolerance ±5 mm", severity: "fault", reaction: "Safe stop", recovery: "Inspect layer, Reset, Start" },
  { id: "NO_FLOW", text: "No material at the nozzle", severity: "fault", reaction: "Safe stop", recovery: "Check hose / leak, Reset, Start" },
  { id: "MAT_LL", text: "Hopper low-low", severity: "warning", reaction: "Print held in place, pump interlocked", recovery: "Automatic resume when hopper > 40 L for 3 s" },
  { id: "MAT_L", text: "Hopper low", severity: "warning", reaction: "Mixer batches requested", recovery: "Automatic" },
  { id: "SILO", text: "Dry-mix silo empty", severity: "warning", reaction: "No new batches", recovery: "Refill silo" },
  { id: "OPEN_TIME", text: "Material open time exceeded", severity: "warning", reaction: "Warns after 20 min on hold", recovery: "Flush hose before restart" },
];

export const ST_PROGRAM = `PROGRAM PRG_ConcretePrinter
(* Construction 3D printing cell – main sequence. Scan time 20 ms. *)
VAR
  Step        : INT := 0;          (* SFC step number shown on the HMI *)
  Layer       : CTU;               (* layer counter *)
  tMixFb, tPumpFb, tPrime, tHoldClear, tHeightDev, tRetry : TON;
  PrintSpeed  : REAL := 100.0;     (* mm/s, tuned by the optimiser *)
  FeedOvr     : REAL := 1.0;
  FlowReq, FlowCorr : REAL;
  Trim        : REAL;              (* Z trim from the height loop, ±8 mm *)
END_VAR

(* ---------- safety and permissives (every scan) ---------- *)
SafetyOK   := I_EStop_OK AND I_Gate_Closed AND I_SafetyRelay_OK;
AxisPermit := SafetyOK AND I_Drive_OK;
PumpPermit := SafetyOK AND AI_Pressure < 28.0 AND NOT I_Hopper_LSLL AND NOT PumpFaultLatched;
IF NOT I_EStop_OK THEN Step := 999; END_IF;          (* category 0 *)

(* ---------- automatic sequence ---------- *)
CASE Step OF
  0:   (* IDLE *)       IF HMI_Start AND SafetyOK AND NOT AnyFault THEN Step := 10; END_IF;
  10:  (* PRECHECK *)   IF MaterialAvailable AND I_Drive_OK AND HeightSensorAlive AND AI_Pressure < 5.0
                          THEN Step := SEL(Homed, 15, 20); ELSE RaiseFault('PRECHECK'); END_IF;
  15:  (* HOMING *)     MoveTo(HOME, 300); IF InPosition THEN Homed := TRUE; Step := 20; END_IF;
  20:  (* MIXING *)     Q_Mixer_Run := TRUE; MoveTo(PURGE, 300);
                        tMixFb(IN := Q_Mixer_Run AND NOT I_Mixer_FB, PT := T#2S);
                        IF tMixFb.Q THEN RaiseFault('MIXER_FB');
                        ELSIF HopperVolume >= 60.0 AND InPosition THEN Step := 30; END_IF;
  30:  (* PRIMING *)    Q_Pump_Run := PumpPermit; Q_Recirc_Valve := NOT Built; Q_Nozzle_Valve := Built;
                        tPrime(IN := AI_Pressure > 3.0 AND AI_Pressure < 22.0 AND AI_Flow > 2.0, PT := T#3S);
                        IF tPrime.Q THEN Step := 40; END_IF;
  40:  (* MOVE_TO_START *) PumpIdleOnRecirc(); MoveAbove(PathPoint(Layer.CV, S)); Descend();
                        IF InPosition THEN Step := 50; END_IF;
  50:  (* PRINTING *)   IF I_Hopper_LSLL THEN Step := 55; END_IF;
                        IF AI_Pressure > 22.0 THEN FeedOvr := MAX(0.5, FeedOvr - 0.25 * dt); END_IF;
                        FlowReq  := BeadWidth * LayerHeight * PrintSpeed * FeedOvr * 60.0 / 1.0E6;   (* L/min *)
                        FlowCorr := LIMIT(0.8, FlowCorr + 0.4 * (FlowReq - AI_Flow) / FlowReq * dt, 1.5);
                        AO_Pump_Speed := FlowReq / 14.0 * 100.0 * FlowCorr;
                        Trim := LIMIT(-8.0, Trim + 3.0 * (LayerHeight - AI_Nozzle_Height) * dt, 8.0);
                        FollowPath(S, Z := (Layer.CV + 1) * LayerHeight + Trim);
                        IF S >= PathLength THEN Q_Nozzle_Valve := FALSE; Layer(CU := TRUE); Step := 60; END_IF;
  55:  (* MATERIAL_HOLD *) FeedHold(); Q_Nozzle_Valve := FALSE;
                        tHoldClear(IN := HopperVolume > 40.0, PT := T#3S);
                        IF tHoldClear.Q AND (AutoRecovery OR HMI_Start) THEN Step := 50; END_IF;
  60:  (* LAYER_END *)  Optimise(LayerStats);       (* speed ±5–8 % from pressure + height RMS *)
                        IF Layer.CV >= LayersTotal THEN Step := 90;
                        ELSIF StepTime >= MAX(1.5, MinLayerTime - LayerTime) THEN Step := 70; END_IF;
  70:  (* LAYER_CHANGE *) S := 0; LoadPath(Layer.CV); Step := 40;
  80:  (* STOPPING *)   FeedHold(); Q_Pump_Run := FALSE; Q_Recirc_Valve := TRUE;
                        IF AI_Pressure < 3.0 THEN Step := 85; END_IF;
  90:  (* FLUSH *)      MoveTo(PURGE); Flush(T#10S); Step := 95;
  900: (* FAULT *)      FeedHold(); Q_Pump_Run := FALSE; Q_Nozzle_Valve := FALSE; Q_Recirc_Valve := TRUE;
                        Q_Mixer_Run := SafetyOK;                       (* keep agitating *)
                        tRetry(IN := AutoRecovery AND OnlyFault('PUMP_FAIL') AND PumpRetries < 1, PT := T#5S);
                        IF tRetry.Q THEN PumpRetries := PumpRetries + 1; Step := 20; END_IF;
  999: (* ESTOP *)      AllOutputsOff();
END_CASE;

(* ---------- fault detection (every scan) ---------- *)
IF AI_Pressure >= 28.0 THEN RaiseFault('P_HH'); END_IF;
tPumpFb(IN := Q_Pump_Run AND NOT I_Pump_FB, PT := T#2S);  IF tPumpFb.Q THEN RaiseFault('PUMP_FAIL'); END_IF;
IF AI_FollowingError >= 5.0 THEN RaiseFault('POS_ERR'); END_IF;
tHeightDev(IN := Step = 50 AND ABS(AI_Nozzle_Height - LayerHeight) > 5.0, PT := T#1500MS);
IF tHeightDev.Q THEN RaiseFault('H_DEV'); END_IF;
IF NOT I_Gate_Closed AND Step IN [10..90] THEN RaiseFault('GATE_RUN'); END_IF;   (* category 1 *)
IF AnyFaultNew THEN Step := 900; END_IF;
END_PROGRAM`;

export const COMPONENTS: { name: string; spec: string; tags: string }[] = [
  { name: "Gantry construction printer (3-axis)", spec: "Build volume 3.2 × 2.6 × 1.2 m · travel 300 mm/s · print 60–150 mm/s", tags: "Q_Axis_Enable · AI_Axis_X/Y/Z · I_Drive_OK" },
  { name: "Dry-mix silo", spec: "Level switch at 5 %", tags: "I_Silo_Low" },
  { name: "Batch mixer", spec: "60 L batch · dose 12 s · mix 25 s", tags: "Q_Mixer_Run · I_Mixer_FB" },
  { name: "Concrete storage hopper", spec: "200 L · LSH 190 · LSL 50 · LSLL 12 L", tags: "I_Hopper_LSH/LSL/LSLL" },
  { name: "Material pump (piston / rotor-stator)", spec: "0–14 L/min on VFD · relief valve 35 bar", tags: "Q_Pump_Run · AO_Pump_Speed · I_Pump_FB" },
  { name: "Flexible material hose", spec: "DN35 · recirculation valve back to hopper", tags: "Q_Recirc_Valve · AI_Pressure" },
  { name: "3D-printing nozzle", spec: "50 mm bead · pinch valve · laser height sensor", tags: "Q_Nozzle_Valve · AI_Nozzle_Height" },
  { name: "Printing platform", spec: "Levelled slab 3.4 × 2.8 m with purge bin", tags: "—" },
  { name: "Sensors", spec: "Pressure 0–40 bar · flow 0–20 L/min · height laser · encoders", tags: "AI_*" },
  { name: "PLC / control system", spec: "Safety PLC, 20 ms scan, SFC sequence + interlocks", tags: "PRG_ConcretePrinter" },
  { name: "HMI control panel", spec: "Start/Stop/Reset, Auto/Manual, pump, alarms, trends", tags: "HMI_*" },
  { name: "Emergency stop & safety", spec: "Dual-channel E-stop, interlocked gate, safety relay, STO", tags: "I_EStop_OK · I_Gate_Closed" },
];

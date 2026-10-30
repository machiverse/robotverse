# Automation Studio — conveyor pick and place

How the studio simulates a conveyor feeding a robot: what was there before, the industrial practice it now follows (with sources), how it works, how it was tested and what is still to do.

The signals are simulated. The studio is a planning tool: it is not a robot program, a PLC program or a certified safety design.

## 1. Audit: what the studio had before this change

These features were available and working before this change:

- **Planner and 3D line** (`/automation-studio`, `/automation-studio/3d`):
  - jobs and briefs become a multi-robot line (`robotKnowledge.planLine`);
  - each robot runs a program of pick, place, weld, process, inspect and tool-change steps in `robotSim.js`, using joint moves and straight-line moves on an analytic six-axis IK scaled to the robot's reach;
  - robots can stand on tracks, overhead rails, gantries, AMRs and lifts;
  - the equipment for 155 jobs, fencing, spacing, reach and interference checks, the motion-clearance watch, Move mode with saved layout edits, labels, camera views and two quality levels.
- **Cell Builder** (`/automation-studio/build`):
  - drag robots and tools from the marketplace and the Directory; the Directory has 1,546 robots with maker, model, axes, payload, reach, repeatability, weight and applications;
  - a six-step guide;
  - a cell program written from the equipment really in the cell (`cellProgram.ts`);
  - fit checks for payload, flange, tools made for one robot maker and cobot versus industrial (`attachmentFit.ts`);
  - job kits;
  - a cycle-time breakdown measured in the simulation;
  - budget and payback, a printable report, CSV export, share links and saving in the browser.

These were missing or unrealistic for conveyor picking (checked by reading the code and running the cells in a browser):

- **Fixed belt and pace:**
  - The belt had a fixed size: 0.4 m wide, 0.78 m high, about 1.8 m long.
  - It ran at a fixed 0.45 m/s, and its surface kept moving even when the part stood still.
- **One part at a time:**
  - A new part appeared at the start of the belt only when the belt was empty.
  - The robot therefore waited about 4 s for every part to travel the whole belt, which made cycle times look worse than they are.
- **No controls:**
  - There was no sensor, no PLC and no stopping or starting of the belt.
  - There was no grip confirmation: a part fixed itself to the tool the moment the fingers closed.
- **No conveyor tracking:** the knowledge base mentioned it in text only (`automationKnowledge.ts`, `engineerPlaybook.ts`).
- **No product or feed settings:** the user could not set the conveyor's length, width, height, speed or side, the product's size or weight, or the feed rate or gap.
- **No I/O view:** nothing showed the signals or what the robot was waiting for, and nothing said what set the pace.
- **Parts vanished:** a full pallet deleted its parts on the spot.

## 2. Research: how integrators do it

No videos were watched; this is from the documents and articles listed under Sources.

### Stop and pick (indexed conveyor)

- **Sensing:** a photo-eye sees each part arrive at the pick position. The PLC stops the belt, or a stop gate holds the part, and tells the robot the part is ready.
- **Handshake** (a common four-signal pattern):
  1. The PLC sets *part ready*.
  2. The robot picks, then sets *pick complete* once it is clear.
  3. The PLC answers by dropping *part ready*.
  4. Each side drops its signal only after the other has dropped its own.
- **Interlocks:**
  - The robot is not re-triggered in the middle of a pick.
  - The belt does not move while the robot is in the conveyor zone.
  - The robot does not start before the part is at rest.
- **Stop gates:** pneumatic stop gates hold one part while the parts behind it accumulate. Zero-pressure accumulation keeps them apart. A spring holds the gate locked if air is lost.

### Conveyor tracking (the belt never stops)

- **Encoder and sync switch:**
  - An encoder on the belt drive gives belt travel.
  - A sync switch (photo-eye) or a camera registers each part together with the encoder count at that moment, so the controller knows where each part is all the way down the belt.
  - ABB's encoder unit queues up to 254 parts.
  - The robot follows the part to within about ±2 mm (ABB data sheet).
- **Tracking window:**
  - The robot may pick only between an upstream and a downstream boundary.
  - At the upstream boundary it waits for a part.
  - Past the downstream boundary the part is gone, and FANUC raises a "track destination gone" error.
  - A maximum tracking distance keeps the robot out of the safety area.
  - Parts that are not picked run on, usually into a recirculation or reject bin.
- **Moves:** tracked moves are straight-line (linear or circular) moves in the conveyor frame. A joint move cannot stay synchronised with the belt.
- **Each maker's option:**
  - FANUC: Line Tracking with iRPickTool.
  - ABB: Conveyor Tracking with PickMaster.
  - KUKA: KUKA.ConveyorTech.
  - Yaskawa: conveyor synchronisation.
  - Universal Robots: conveyor tracking in PolyScope.

### Grip confirmation

- **Sensing the grip:** a vacuum gripper confirms the part with a vacuum switch or pressure sensor. A finger gripper confirms it with jaw-position sensors: the jaws stop on the part, not fully closed.
- **When to lift and how to retry:**
  - The robot lifts only after the part-present signal.
  - Without it, the robot opens, backs off and retries a limited number of times, then rejects the part or raises an alarm.
  - The signal is also watched during the transfer.

### Rules taken into the studio

1. Every part is created by a feeder (or by the robot upstream) and moves only with the belt or with the gripper. It never jumps, floats or vanishes. Missed parts fall into a bin; full pallets roll out with their load.
2. Stop and pick:
   - PE1 → the PLC brakes the belt so the part rests at the pick position → PART_READY.
   - The robot goes down (ROBOT_IN_ZONE; the belt is interlocked), closes the gripper (GRIP_CMD) and lifts only on GRIP_OK.
   - Once it is clear, PICK_DONE tells the PLC to restart the belt.
3. Tracking:
   - PE1 syncs each part with the encoder count.
   - The robot claims only a part it can still catch inside its window, matches the belt speed, grips on the move, and lifts while still following the belt.
   - A part that leaves the window is let go; it runs into the reject bin and is counted as missed.
4. The belt accelerates and brakes within the drive's limits: 1.2 m/s² starting and 1.5 m/s² braking by default. The braking distance follows from v²/2a.
5. The feeder keeps the gap, so the photo-eye sees each part separately, and it never puts a part on an occupied entry.
6. Throughput is measured in the simulation, never assumed. The pace-setter is measured from the first pick:
   - parts waiting for the robot, or missed, mean the robot sets the pace;
   - the robot waiting for parts means the feed or the conveyor does.

## 3. What changed

- **`conveyorLogic.js`** (new, framework-free, with a `.d.ts`):
  - the feeder, the belt kinematics, PE1, the PLC states (RUN → BRAKE → READY → RESTART) and the robot handshake;
  - tracking with an encoder, a sync switch, a window, missed parts and a reject bin;
  - the counters and timers that work out what sets the pace;
  - it runs on a fixed 1/240 s clock.
- **`conveyorAutomation.ts`** (new): "Generate automation".
  - **Checks:**
    - that there is a robot, a gripper and a place for the part;
    - payload, with part and gripper weight together;
    - that the gripper suits the product;
    - belt width, height and length;
    - speed for stop and pick or for tracking;
    - gap and feed against what the belt can carry;
    - that the robot maker offers tracking.
  - **Output:** the seven-step sequence with the signals each step uses, the I/O list, estimates (pitch, index time, braking distance) and the simulator settings.
- **`robotSim.js`:**
  - **Conveyor:**
    - the conveyor runs on the logic, and every part on it sits where the logic says;
    - the belt surface moves exactly with the parts;
    - new parts: a feeder hood with a strip curtain, the photo-eye with a beam that turns red when blocked, and for tracking an encoder, window marks and a reject bin.
  - **Robot's pick:**
    - stop and pick with the handshake and a grip check that retries;
    - a tracking pick that follows the moving part, grips it on the move, lifts while following and lets go of a part it cannot catch;
    - the robot's GRIP_CMD and GRIP_OK, what it is doing now, and the parts it has placed.
  - **Full pallets** roll out with their load to the pick-up place and stay there until the next full one comes; an empty pallet takes their place.
  - **Fixed-step clock** (1/120 s): the run is the same at any frame rate.
  - **New simulator API:**
    - `setAutomation()` for the conveyor, product and pick-mode settings;
    - `stepEvent()` to step to the next event while paused;
    - `automation` in the update with the PLC state, I/O, parts, counters and the pace-setter.
  - **Tracking window:** worked out from the robot's own IK reach, approach included.
- **Cell Builder:**
  - a "Conveyor pick & place" ready cell;
  - a "Conveyor automation" dialog on the first cell, with:
    - **settings:** pick mode; conveyor length, width, height, speed and side; product, size and weight; feed rate and gap; where the part goes;
    - **"Generate automation":** the checks, the sequence and the I/O list;
    - **"Start simulation".**
  - A live I/O panel on the stage with:
    - signal lamps, the PLC state and what the robot is doing;
    - belt speed, parts on the belt and the distance to the pick position;
    - counts of parts fed, picked, placed and missed;
    - the measured cycle, parts per hour, the pace-setter and the last PLC event;
    - Pause, Step and Resume.
  - The setup is saved with the cell.

## 4. Tested

- `tests/conveyor-logic.test.ts` checks, frame by frame:
  - no part moves backwards, faster than the belt, overlaps another or vanishes;
  - every fed part is on the belt, picked or off the end;
  - the belt never moves while the robot is in the zone;
  - every pick happens with the part at rest within 2 mm of the pick position.
- The same file also checks:
  - a slow feeder makes the robot wait;
  - tracking never stops the belt, and missed parts reach the bin;
  - a transfer belt and an outfeed work;
  - the same belt stepped in 1/60 s frames and in 0.1 s frames ends in exactly the same state.
- `tests/conveyor-automation.test.ts` covers:
  - the seven stages and the handshake signals;
  - the vacuum-switch grip sensor;
  - braking distance;
  - stops for too heavy, no gripper, a welding torch instead of a gripper, nothing chosen, and a belt too narrow;
  - warnings for speed and feed;
  - the robot maker's tracking option, or a warning when it is unknown.
- Browser, 120 s of simulated time each, checked at every event:
  - **Default belt:** 21 parts placed, 5.3 s cycle, the robot sets the pace.
  - **Custom stop and pick:** a 2.4 m belt, 850 mm high, castings resized, 8 parts a minute; 15 parts placed, 7.6 s cycle, feed and robot balanced.
  - **Tracking:** a 3.4 m belt at 0.25 m/s, 10 cartons a minute; the belt never stopped, 16 parts were placed and 3 missed parts went to the bin.
  - No invariant broken, and no errors in the console.
- Cell Builder in Chromium at 1440 × 900 and 390 × 844:
  - ready cell → dialog → Generate → Start → live I/O panel, for both stop and pick and tracking.

## 5. Still to do

These master-brief items are not built yet:

- Robot model and motion:
  - per-model kinematics with joint limits and joint speed and acceleration limits; the arm is a generic six-axis model scaled to the robot's reach, so treat the 3D motion as approximate;
  - collision avoidance, not just the clearance watch.
- An editable visual workflow (the sequence is generated, not edited).
- A timeline under the stage.
- Global undo and redo.
- Sensors, light curtains and E-stops as separate library items.
- Conveyor coverage:
  - automation settings for the conveyors of the second and later robots;
  - sorting and reject by sensor.
- Sealed cartons still swap at once.
- Demos for CNC tending, palletizing and two-robot transfer with the new controls.
- Linking the AI planner to the conveyor setup.

## Sources

- FANUC America tech transfer — [iRPickTool tracking frames](https://techtransfer.fanucamerica.com/tech-transfer/irpicktool-tracking-frames), [TRAK-005 "track destination gone"](https://techtransfer.fanucamerica.com/tech-transfer/irpicktool-irpickpro-introduction-3), [iRPickTool / iRVision 3D](https://www.fanucamerica.com/products/software/robot/irpicktool-irvision-3d)
- ABB — [Conveyor Tracking data sheet](https://library.e.abb.com/public/51c0fc4c87a036f6c1257b1300579b96/Data%20sheet%20Conveyor_tracking.pdf) (from its search summary: this session's network could not open it); [ABB introduces advanced Conveyor Tracking, Industrial Robot (2002)](https://doi.org/10.1108/ir.2002.04929aad.006)
- KUKA — [conveyor tracking with ConveyorTech](https://industrialmonitordirect.com/blogs/knowledgebase/kuka-robot-conveyor-tracking-for-continuous-part-gripping) (third-party article; check against KUKA's documentation)
- [US 5,969,339 — conveyor tracking with photoelectric sensors and an encoder](https://patents.google.com/patent/US5969339)
- [Robot-to-PLC handshaking, Control.com](https://control.com/technical-articles/robot-to-plc-handshaking/) (from its search summary); [PLC–robot state synchronisation](https://industrialmonitordirect.com/blogs/knowledgebase/plc-robot-state-synchronization-integration-methods)
- [Bosch Rexroth VE 2 stop gate](https://store.boschrexroth.com/en/us/STOP-GATE_0842900300)
- [Robotiq Grip Check](https://blog.robotiq.com/knowledge/grip-check-5-1736280854895); [US 7,261,350 — suction confirmation sensor](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7261350); [Real-time vacuum gripper monitoring, MDPI Processes (2021)](https://mdpi-res.com/d_attachment/processes/processes-09-00634/article_deploy/processes-09-00634.pdf)

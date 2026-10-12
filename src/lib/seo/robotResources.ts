/** Additive, factual resources. Existing catalogue data and page metadata stay independent. */
export interface RobotResourceLink {
  href: string;
  label: string;
}

export interface RobotResourceSection {
  heading: string;
  paragraphs: string[];
  links?: RobotResourceLink[];
}

export interface RobotResource {
  slug: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  sections: RobotResourceSection[];
  faq: Array<{ question: string; answer: string }>;
}

export const ROBOT_RESOURCE_BASE_URL = "https://www.robotverse.in";

export const ROBOT_RESOURCES: RobotResource[] = [
  {
    slug: "industrial-robots",
    title: "Industrial Robot Selection Guide | RobotVerse",
    description: "Choose an industrial robot by application, payload, reach and controller. Compare robot types, used equipment checks and cell integration requirements.",
    heading: "How to choose an industrial robot for your application",
    intro: "A useful robot shortlist starts with the workpiece and production process. Whether you need a robot arm for welding, material handling, assembly or CNC machine tending, compare the complete cell requirements before selecting a manufacturer or model. RobotVerse connects model specifications, equipment listings and planning tools so you can investigate each option.",
    sections: [
      {
        heading: "Match the robot type to the work",
        paragraphs: [
          "A six-axis articulated robot can position and orient a tool around a part, which suits tasks such as welding and machine tending. SCARA robots suit many planar assembly operations; delta robots are often used for fast handling of lightweight items. Dedicated palletizing robots are designed around stacking tasks.",
          "Collaborative robots can suit flexible tasks, but the complete application still needs a risk assessment. A sharp tool, hot workpiece or crushing point can require additional protection. Choose the process first, then check whether the robot's motion, tooling and safety measures meet it.",
        ],
        links: [
          { href: "/robots/application/welding", label: "Welding robot applications" },
          { href: "/robots/application/machine-tending", label: "CNC machine tending robots" },
          { href: "/robots/application/palletizing", label: "Palletizing robot applications" },
        ],
      },
      {
        heading: "Check payload, reach and performance together",
        paragraphs: [
          "Payload includes the workpiece, gripper, adapters and equipment carried by the wrist. Check the manufacturer's load diagrams for centre of gravity, wrist moment and inertia limits; a kilogram rating alone does not establish suitability. Leave appropriate capacity for the actual motion and process.",
          "Maximum reach does not describe every usable pose. Check access to fixtures, tool orientation, joint limits and obstacles throughout the cycle. Repeatability describes repeated positioning under specified conditions and differs from absolute accuracy. Validate the process tolerance and cycle time with representative parts.",
        ],
        links: [
          { href: "/directory", label: "Compare robot model specifications" },
          { href: "/robots/compare", label: "Compare industrial robot listings" },
        ],
      },
      {
        heading: "Inspect used and refurbished robot systems",
        paragraphs: [
          "Record the arm model, serial number, controller version and supplied accessories. Ask about service history, operating hours where available, alarms, mechanical wear and repair work. Request a demonstration of the complete arm and controller, including movement, brakes and safety functions, with qualified assistance.",
          "Confirm the teach pendant, cables, software options, documentation and backups included in the sale. Check local power requirements, mounting, transport arrangements and availability of compatible replacement parts. Inspection findings and seller terms should determine the purchase decision; condition labels alone are insufficient.",
        ],
        links: [
          { href: "/robots", label: "Browse industrial robots for sale" },
          { href: "/buyer-guide", label: "Read the robot buyer guide" },
        ],
      },
      {
        heading: "Plan the complete automation cell",
        paragraphs: [
          "Allow for end-of-arm tooling, fixtures, guarding, sensors and interfaces to the surrounding machines. A robot controller may need specific communication options for a PLC, vision system or welding power source. Identify installation, commissioning, operator training and maintenance responsibilities before committing to equipment.",
          "Use a preliminary cell layout to investigate reach and clearances, then have an integrator verify the design against the actual robot and process. Simulations support planning; measured trials and a safety assessment establish whether the finished cell meets production requirements.",
        ],
        links: [
          { href: "/automation-studio/build", label: "Plan a robot cell in 3D" },
          { href: "/services", label: "Find robot integration and maintenance services" },
        ],
      },
    ],
    faq: [
      {
        question: "How do I choose the payload of an industrial robot?",
        answer: "Add the workpiece, tool and all wrist-mounted equipment. Then check the manufacturer's centre-of-gravity, moment and inertia limits for the intended movements, with an appropriate operating margin.",
      },
      {
        question: "Does a collaborative robot always work without guarding?",
        answer: "No. The complete application needs a risk assessment. Tooling, workpieces, speed and surrounding equipment determine which safety measures are required.",
      },
    ],
  },
  {
    slug: "robot-spare-parts",
    title: "Robot Spare Parts Compatibility Guide | RobotVerse",
    description: "Find robot spare parts by part number, controller and model. Check servo motors, drives, reducers, encoders, teach pendants and cables before ordering.",
    heading: "How to identify compatible industrial robot spare parts",
    intro: "The right replacement part depends on the exact robot system, not just its brand. FANUC, ABB, KUKA, Yaskawa and other manufacturers use different components across arm models and controller generations. Start with the equipment identification and the installed part, then confirm compatibility before ordering a robot spare part.",
    sections: [
      {
        heading: "Record the part number and system configuration",
        paragraphs: [
          "Photograph the robot nameplate and the component label. Record the complete part number, revision, serial number where relevant, arm model, axis and controller designation. Similar-looking suffixes can identify a different electrical rating, connector, firmware or mounting arrangement, so avoid relying on photographs alone.",
          "If the manufacturer has replaced an older part number, ask for the documented replacement relationship and any required adapters or software changes. Share relevant labels and fault information with the supplier. Check the equipment manual or consult a qualified service provider when identification is uncertain.",
        ],
        links: [
          { href: "/parts", label: "Search robot spare parts listings" },
          { href: "/directory?tab=parts", label: "Explore robot components in the directory" },
        ],
      },
      {
        heading: "Check motion and mechanical components",
        paragraphs: [
          "For a servo motor, compare the specified electrical ratings, feedback device, brake, shaft and connector arrangement. A motor and servo drive must be compatible with each other and the controller. An encoder can require a particular feedback interface and configuration even when its housing fits.",
          "For gearboxes and reducers, check the axis, reduction ratio, mounting dimensions and load limits. Bearings, seals and lubrication requirements also vary by assembly. Changing a motor, encoder or reducer may require mastering or calibration according to the manufacturer's maintenance procedure.",
        ],
        links: [
          { href: "/spares/robot-parts/motors-gearboxes/servo-motors", label: "Robot servo motors" },
          { href: "/spares/robot-parts/motors-gearboxes", label: "Gearboxes, reducers and encoders" },
        ],
      },
      {
        heading: "Verify controllers, pendants and cabling",
        paragraphs: [
          "Controller boards, power supplies and servo amplifiers can depend on the controller generation and software version. Verify manufacturer compatibility information before swapping modules. Back up the existing configuration using the supported procedure and identify any settings that the replacement requires.",
          "Teach pendants must match the controller and its safety interfaces. Check cable part numbers, pinouts, shielding and connector types; moving cables also need suitable flex characteristics and routing. A connector that physically fits does not prove electrical compatibility or correct safety operation.",
        ],
        links: [
          { href: "/spares/robot-parts/controllers-drives", label: "Robot controllers and servo drives" },
          { href: "/spares/devices/hmis-teach-devices/teach-pendants", label: "Robot teach pendants" },
          { href: "/spares/robot-parts/cabling-connectivity", label: "Robot cables and connectivity" },
        ],
      },
      {
        heading: "Agree on condition, testing and installation",
        paragraphs: [
          "Ask whether the offered component is new, used, repaired or refurbished, and request evidence of the testing performed. Confirm the actual part supplied, its included accessories and the seller's warranty and return terms. These conditions belong to the individual offer and should be checked directly.",
          "Plan replacement with qualified personnel, safe isolation and the manufacturer's procedures. After installation, check configuration, calibration and relevant safety functions before returning the cell to production. Keep the part identification and service records to make future maintenance easier.",
        ],
        links: [
          { href: "/services", label: "Find robot repair and maintenance providers" },
          { href: "/buyer-guide", label: "Review buying and inspection guidance" },
        ],
      },
    ],
    faq: [
      {
        question: "Is a robot spare part compatible if it has the same brand?",
        answer: "Brand alone is insufficient. Match the exact part number, revision, robot model and controller configuration, and confirm any manufacturer-approved replacement relationship.",
      },
      {
        question: "Are warranty and return terms the same for every spare part?",
        answer: "Check the individual seller's written terms for the offered component. Condition, testing, warranty and returns can differ between listings.",
      },
    ],
  },
  {
    slug: "robot-directory",
    title: "Robot Directory and Datasheet Guide | RobotVerse",
    description: "Use robot model specifications and manufacturer datasheets to compare payload, reach, repeatability, tooling and external axes before planning a robot cell.",
    heading: "How to use robot specifications and manufacturer datasheets",
    intro: "A robotics directory helps you compare industrial robot models before contacting equipment suppliers. Use the model pages to build a shortlist, then verify important details in the manufacturer's documentation for the exact variant. A specification entry describes a model; a marketplace listing describes an individual unit offered by a seller.",
    sections: [
      {
        heading: "Find the exact manufacturer and model variant",
        paragraphs: [
          "Search by manufacturer and full model designation, including payload or reach suffixes. Models within one family can have different arm geometry, wrist ratings, protection or mounting requirements. Compare the full name and document revision rather than treating a family brochure as confirmation for every variant.",
          "RobotVerse's directory includes robot models, end-of-arm tools and external axes. Follow a model's specifications page for the available fields and related models. Where a verified datasheet link is available, open the PDF and check that its manufacturer and model match your shortlist.",
        ],
        links: [
          { href: "/directory", label: "Browse industrial robot model specifications" },
          { href: "/robots/compare", label: "Compare listed robot systems" },
        ],
      },
      {
        heading: "Read specifications in their operating context",
        paragraphs: [
          "Payload and reach are starting points. The usable working envelope also depends on joint limits, tool orientation, mounting and obstructions. Read the manufacturer's load diagrams, wrist moments and inertia limits when choosing a gripper and workpiece combination. Include adapters and carried equipment in the calculation.",
          "Position repeatability differs from absolute accuracy, and published values depend on specified test conditions. Review environmental protection, installation requirements and process-specific options when relevant. Missing directory values should remain questions for the manufacturer or supplier rather than assumptions about the robot's capability.",
        ],
        links: [
          { href: "/robot-guides/industrial-robots", label: "Read the industrial robot selection guide" },
          { href: "/automation-studio/playbook", label: "Explore robot cell planning guidance" },
        ],
      },
      {
        heading: "Compare tooling and external axes with the robot",
        paragraphs: [
          "A mechanical gripper, vacuum tool or welding torch must suit the task and the robot interface. Check tool weight, centre of gravity, mounting flange and required electrical, pneumatic or process connections. Compatibility may depend on the controller options and integration hardware as well as the arm.",
          "Linear tracks and rotary positioners add motion and installation requirements. Check load capacity, travel, mounting, control integration and cable management with the supplier. Include the moving equipment and workpiece in cell layout and safety planning; an external axis is not automatically compatible with every controller.",
        ],
        links: [
          { href: "/directory?tab=tools", label: "Compare end-of-arm tools" },
          { href: "/directory?tab=axes", label: "Explore external axes and positioners" },
          { href: "/spares/tools/end-effectors", label: "Browse end-effector listings" },
        ],
      },
      {
        heading: "Turn the shortlist into a verified equipment choice",
        paragraphs: [
          "Use model specifications to identify candidates, then check the actual marketplace unit's condition, controller and included accessories. A datasheet does not confirm that a used robot includes every factory option or that spare parts are interchangeable. Verify those details against the unit's identification and seller documentation.",
          "Keep the relevant documents with your selection notes and ask a qualified integrator to review the process and complete cell. Preliminary 3D planning can help investigate layout; manufacturer documentation, physical checks and application validation support the final purchase and commissioning decisions.",
        ],
        links: [
          { href: "/robots", label: "Find industrial robot equipment listings" },
          { href: "/robot-guides/robot-spare-parts", label: "Check spare part compatibility" },
          { href: "/automation-studio/build", label: "Explore a preliminary 3D robot cell" },
          { href: "/services", label: "Find integration and commissioning services" },
        ],
      },
    ],
    faq: [
      {
        question: "Does a robot model datasheet describe an individual used robot?",
        answer: "A datasheet describes the manufacturer's model or variant. Confirm the individual unit's condition, controller, installed options and accessories with its seller.",
      },
      {
        question: "What should I do when a specification or PDF is missing?",
        answer: "Confirm the missing information with the manufacturer or supplier for the exact model. Do not infer a rating or assume that a similar model's documentation applies.",
      },
    ],
  },
];

/** Resolve only published resource paths; query strings do not create separate guides. */
export function getRobotResource(path: string): RobotResource | null {
  const normalized = String(path ?? "").split(/[?#]/)[0].replace(/\/+$/, "");
  const match = /^\/robot-guides\/([a-z0-9-]+)$/.exec(normalized);
  return match ? ROBOT_RESOURCES.find((resource) => resource.slug === match[1]) ?? null : null;
}

/** Every node describes text and navigation rendered by RobotResourceContent. */
export function resourceStructuredData(resource: RobotResource) {
  const url = `${ROBOT_RESOURCE_BASE_URL}/robot-guides/${resource.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: resource.heading,
        description: resource.description,
        inLanguage: "en-IN",
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${ROBOT_RESOURCE_BASE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Robot guides", item: `${ROBOT_RESOURCE_BASE_URL}/robot-guides` },
          { "@type": "ListItem", position: 3, name: resource.heading, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        isPartOf: { "@id": `${url}#webpage` },
        mainEntity: resource.faq.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

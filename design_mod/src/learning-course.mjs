export const chapters=['Composition','Physics','Design','History'];
// Source geometry determines component hotspots at runtime.
export const lessons=[
  {
    "id": "wheels",
    "name": "Wheels & tires",
    "short": "Wheels",
    "kicker": "WHERE THE CAR MEETS THE WORLD",
    "intro": "Four small contact patches. Every move begins here.",
    "match": /tire|wheel/i,
    "minutes": 12,
    "sections": [
      [
        "More than a circle.",
        "The tire and wheel do different jobs. The tire provides a compliant, grippy interface; the metal wheel transfers forces to the hub. Inside a typical radial tire, a liner retains air, a cord carcass carries load, and belts stabilize the tread.",
        "Separate the source tire and wheel. Select either component to inspect its original surfaces."
      ],
      [
        "Rotation becomes motion.",
        "For rolling without slipping, road speed equals angular speed multiplied by rolling radius: v = ωr. At the same road speed, a smaller rolling radius needs more revolutions per minute. Grip is what allows the tire to transmit braking and cornering forces.",
        "Change road speed and compare wheel speed. The source wheel turns slowly for inspection; the calculation uses an illustrative 0.32 m rolling radius."
      ],
      [
        "Every gram has a job.",
        "Wheel spokes must transfer loads while leaving room for brakes and airflow. Reducing rotating mass can help response, but stiffness, fatigue strength, impact resistance, and cost still matter. Tire grooves move water; rubber compound and temperature also affect grip.",
        "Orbit the original wheel and inspect the spoke roots, rim profile, and space around the hub. Use the surface inspection control to reveal curvature."
      ],
      [
        "A different direction.",
        "Early automotive wheels evolved from carriage construction. Pneumatic tires introduced an air cushion. Michelin patented its radial tire in 1946: the cord orientation separated sidewall flexibility from tread support, changing tire design.",
        "Inspect the modern wheel and tire in this car. The historical constructions described here are not present in the source asset."
      ]
    ],
    "lab": {
      "label": "Road speed",
      "min": 0,
      "max": 120,
      "value": 50,
      "unit": "km/h"
    },
    "question": "At the same road speed, a smaller rolling radius needs…",
    "answers": [
      "More revolutions per minute",
      "Fewer revolutions per minute",
      "The same revolutions per minute"
    ],
    "correct": 0,
    "explanation": "From v = ωr, reducing r while holding v constant increases ω.",
    "source": [
      "Michelin · The radial tire",
      "https://news.michelin.co.uk/articles/the-triumph-of-the-radial-tyre"
    ]
  },
  {
    "id": "brakes",
    "name": "Braking system",
    "short": "Brakes",
    "kicker": "THE SCIENCE OF SLOWING DOWN",
    "intro": "Turn motion into heat. With extraordinary control.",
    "match": /brake/i,
    "minutes": 10,
    "sections": [
      [
        "A controlled squeeze.",
        "In a disc brake, a rotor spins with the hub while a caliper holds friction pads beside it. Hydraulic pressure moves pistons to press the pads against the rotor. The caliper reacts the torque into the suspension structure.",
        "Orbit the source brake assembly and inspect its visible rotor and caliper surfaces. Internal pads are not separately modeled."
      ],
      [
        "Where the energy goes.",
        "A moving vehicle stores kinetic energy: E = ½mv². Friction braking converts much of that energy into heat. Doubling speed gives four times the kinetic energy at the same mass. Tire grip and conditions limit how quickly the vehicle can slow.",
        "Adjust the speed and compare the energy that the braking system must manage. The 1,400 kg mass is illustrative for all three courses."
      ],
      [
        "Make room for heat.",
        "A ventilated disc has channels between its friction faces that help air carry heat away. Disc size, material, pad chemistry, and airflow are balanced for repeated use. Holes or slots are choices with tradeoffs, not a universal measure of braking quality.",
        "Zoom into the source rotor and examine any visible holes, grooves, and caliper clearances. Do not infer hidden cooling passages from this mesh."
      ],
      [
        "From drums to discs.",
        "Drum brakes press shoes against an inner rotating surface. Disc brakes expose their friction surfaces to airflow. Both designs remain in use. Anti-lock control adds repeated pressure modulation to help avoid sustained wheel lock.",
        "Inspect this car’s disc-brake surfaces while considering how exposure to airflow differs from an enclosed drum."
      ]
    ],
    "lab": {
      "label": "Starting speed",
      "min": 0,
      "max": 120,
      "value": 50,
      "unit": "km/h"
    },
    "question": "Doubling speed at the same mass gives how much kinetic energy?",
    "answers": [
      "Twice as much",
      "Four times as much",
      "The same amount"
    ],
    "correct": 1,
    "explanation": "Speed is squared in E = ½mv², so a factor of two becomes a factor of four.",
    "source": [
      "Brembo · Brake disc design",
      "https://www.brembo.com/en/news-archive/drilled-slotted-disc"
    ]
  },
  {
    "id": "body",
    "name": "Body & structure",
    "short": "Body",
    "kicker": "STRENGTH, SHAPED",
    "intro": "A shell that manages air, loads, and space.",
    "match": /body|chassis|bumper|grille|door|fender|quarter|rocker|roof|hood|trunk/i,
    "minutes": 11,
    "sections": [
      [
        "Skin and skeleton.",
        "Outer panels define the visible surface. Structural members, joints, and reinforcements carry loads around the cabin and between suspension attachments. Some exterior panels also contribute stiffness; their exact role depends on the vehicle.",
        "Separate the source body assemblies. Click a door, closure, or structural surface to examine its shape."
      ],
      [
        "Air pushes back.",
        "Aerodynamic drag can be approximated by F = ½ρCdAv². With air density, frontal area, and drag coefficient fixed, doubling speed quadruples drag force. Power to overcome that drag grows with the cube of speed.",
        "Orbit to the front to study the frontal silhouette; adjust speed to explore how drag grows. The aerodynamic coefficients are illustrative."
      ],
      [
        "Stiffness through shape.",
        "A folded or closed section can resist bending more efficiently than a flat sheet of the same material. Engineers also balance joining methods, corrosion protection, repairability, and mass. Controlled crush regions and a strong occupant space have different jobs.",
        "Use the surface inspection control to reveal the actual panel curvature and edge transitions. The source geometry stays unchanged."
      ],
      [
        "A body becomes a structure.",
        "Early automobiles commonly mounted a body onto a separate frame. Unitized construction combines the body and structural shell. Separate frames still suit some vehicles; neither layout alone determines safety or quality.",
        "Inspect the present-day shell. Separate-frame construction described here is historical context, not an additional model."
      ]
    ],
    "lab": {
      "label": "Air speed",
      "min": 0,
      "max": 120,
      "value": 60,
      "unit": "km/h"
    },
    "question": "With all other factors fixed, doubling speed makes aerodynamic drag…",
    "answers": [
      "Double",
      "Quadruple",
      "Disappear"
    ],
    "correct": 1,
    "explanation": "Drag force is proportional to v² in this simplified model.",
    "source": [
      "NHTSA · Vehicle safety",
      "https://www.nhtsa.gov/vehicle-safety"
    ]
  },
  {
    "id": "glass",
    "name": "Glass & visibility",
    "short": "Glass",
    "kicker": "A CLEARER VIEW",
    "intro": "An engineered boundary between you and the world.",
    "match": /glass|windshield|sunroof|mirror/i,
    "minutes": 8,
    "sections": [
      [
        "A transparent sandwich.",
        "A typical modern windshield uses laminated glass: two glass plies bonded by a polymer interlayer. Side and rear glazing may be tempered or laminated depending on the vehicle. This model does not establish the exact glazing specification of this source car.",
        "Separate the original glazing assemblies to inspect their curvature and placement. The source does not model the laminate’s internal layers."
      ],
      [
        "Light changes direction.",
        "Light refracts when it passes between materials with different refractive indices. Snell’s law relates the incident and refracted angles: n₁ sin θ₁ = n₂ sin θ₂. Curvature and optical consistency matter for a clear view.",
        "Adjust the angle to calculate refraction at an ideal air–glass interface. The car’s curved glazing is a visual reference, not a ray-traced optical simulation."
      ],
      [
        "Seeing around the curve.",
        "Designers balance sightlines, reflections, optical distortion, pillar placement, and cabin temperature. A convex mirror widens the field of view but makes objects appear smaller. Laminated and tempered glass manage breakage differently.",
        "Orbit the original windshield, windows, and mirrors to consider sightlines and curvature."
      ],
      [
        "From a screen to a system.",
        "Automotive glazing developed from simple weather protection into an engineered safety and visibility system. Laminates, heat treatment, coatings, and embedded heating are different tools for different glazing requirements.",
        "Inspect the source glazing while comparing the historical material approaches in the text. Only the current car is modeled."
      ]
    ],
    "lab": {
      "label": "Incident angle",
      "min": 0,
      "max": 75,
      "value": 35,
      "unit": "°"
    },
    "question": "What is the central polymer layer doing in laminated glass?",
    "answers": [
      "Making the glass opaque",
      "Bonding and retaining the glass layers",
      "Replacing the outer glass"
    ],
    "correct": 1,
    "explanation": "The interlayer bonds the glass plies and helps retain fragments after breakage.",
    "source": [
      "NHTSA · Vehicle safety",
      "https://www.nhtsa.gov/vehicle-safety"
    ]
  },
  {
    "id": "lights",
    "name": "Lighting & signals",
    "short": "Lighting",
    "kicker": "SEE. AND BE SEEN.",
    "intro": "Small sources. Precisely controlled light.",
    "match": /lamp/i,
    "minutes": 8,
    "sections": [
      [
        "A beam is built.",
        "A lamp is an optical system: source, reflector or lens, housing, and electrical control. Headlamps illuminate the road; rear and signal lamps communicate presence and intent. The car asset shows exterior surfaces, not a verified internal lamp design.",
        "Inspect the car’s original lamp assemblies. Select a component and orbit closely around its lenses and housing."
      ],
      [
        "Spread changes intensity.",
        "For an ideal point source, illuminance falls with the square of distance. Real headlamps use shaped beams, so this simple rule is a starting point, not a complete photometric model. Optics put light where it is useful and limit glare.",
        "Adjust distance to compare the ideal inverse-square relationship. The source lamp is not a measured photometric simulation."
      ],
      [
        "Precision over brightness.",
        "A useful headlamp balances reach, spread, and glare control. Source cooling and accurate positioning matter too. Brighter output alone does not guarantee better visibility; beam distribution is essential.",
        "Use surface inspection to examine the lens shape and packaging within the bodywork."
      ],
      [
        "From flame to semiconductor.",
        "Early motoring lamps used flame. Electric filament lamps, halogen, discharge sources, and LEDs brought different efficiencies and optical possibilities. Modern systems can shape light with much finer control.",
        "Compare the packaging of this car’s visible lamps with the earlier light-source technologies described here."
      ]
    ],
    "lab": {
      "label": "Distance",
      "min": 5,
      "max": 50,
      "value": 15,
      "unit": "m"
    },
    "question": "For an ideal point source, doubling distance gives…",
    "answers": [
      "Half the illuminance",
      "Twice the illuminance",
      "One quarter of the illuminance"
    ],
    "correct": 2,
    "explanation": "The inverse-square rule gives 1/2² = 1/4 of the illuminance.",
    "source": [
      "NHTSA · Vehicle safety",
      "https://www.nhtsa.gov/vehicle-safety"
    ]
  },
  {
    "id": "cabin",
    "name": "Cabin & restraint",
    "short": "Cabin",
    "kicker": "DESIGNED AROUND YOU",
    "intro": "The human at the center of the machine.",
    "match": /cabin/i,
    "minutes": 9,
    "sections": [
      [
        "A coordinated space.",
        "Seat, steering wheel, pedals, displays, and restraints are designed around the occupant. The seat frame and its attachments carry loads. Belts and airbags work together; airbags supplement seat belts.",
        "Explore the actual source interior. Zoom into the seats, steering wheel, and trim; only geometry included by the creator is displayed."
      ],
      [
        "Time changes force.",
        "For a given change in momentum, increasing the time over which an occupant slows reduces the average force: Favg = mΔv/Δt. Real crash forces vary over time and across the body; this simple illustration does not predict injury.",
        "Adjust stopping time and compare average force. The source cabin remains a visual reference; this is not a crash simulation."
      ],
      [
        "Fit is a design problem.",
        "People vary in size and posture. Adjustability helps place controls within reach and preserve sightlines. Restraint geometry matters: a lap belt should sit across the hips, and a shoulder belt across the chest.",
        "Orbit the source cabin to examine reach, seat position, and visible controls. The seat is not distorted to represent a hypothetical design."
      ],
      [
        "Protection becomes a system.",
        "Occupant protection developed from basic seating into coordinated belts, airbags, stronger occupant spaces, and managed crash energy. Airbags do not replace belts; correct restraint use remains fundamental.",
        "Inspect the original cabin while considering how coordinated restraint systems developed. Hidden airbags and belt mechanisms are not modeled."
      ]
    ],
    "lab": {
      "label": "Stopping time",
      "min": 50,
      "max": 300,
      "value": 150,
      "unit": "ms"
    },
    "question": "For the same momentum change, a longer stopping time means…",
    "answers": [
      "Lower average force",
      "Higher average force",
      "No change in average force"
    ],
    "correct": 0,
    "explanation": "Favg = Δp/Δt: increasing the denominator lowers the average force.",
    "source": [
      "NHTSA · Seat belts",
      "https://www.nhtsa.gov/vehicle-safety/seat-belts"
    ]
  },
  {
    "id": "engine",
    "name": "Flat-six engine",
    "short": "Engine",
    "kicker": "THE HEART OF THE MACHINE",
    "intro": "2010 911 Carrera 4S · 997.2. rear-mounted flat-six.",
    "match": /engine/i,
    "minutes": 14,
    "sections": [
      [
        "6 cylinders. One system.",
        "2010 911 Carrera 4S · 997.2 is the selected course reference, using a 3.8 L naturally aspirated flat-six with direct fuel injection. Combustion pressure acts on pistons, connecting rods transmit force, and the crankshaft delivers rotary output. Valves, induction, lubrication, and cooling form part of the complete engine assembly.",
        "The exact engine CAD is not yet available. The schematic substitute has been removed; no generic engine is presented as this car’s engine."
      ],
      [
        "Four strokes. Two revolutions.",
        "Each cylinder completes intake, compression, expansion, and exhaust in two crankshaft revolutions. For this 6-cylinder four-stroke layout, the total power-stroke rate is RPM ÷ 60 × 6 ÷ 2. This counts events, not engine output.",
        "Change engine speed to calculate the cycle rate. No firing-order or piston-motion simulation is shown without verified engine geometry."
      ],
      [
        "Packaging shapes performance.",
        "The rear-mounted flat-six places three cylinders on each side of the crankshaft. Its low, wide form influences exhaust routing, cooling connections, service access, and the position of mass behind the rear axle.",
        "The exact component geometry must be sourced before dimensions, clearances, and internal arrangements can be inspected in 3D."
      ],
      [
        "An architecture, developed.",
        "The 997 generation developed the 911 architecture through changes including direct fuel injection. The updated 3.8 L S engine was rated at 385 PS by Porsche. The 2010 Carrera 4S is the reference chosen for this course.",
        "Read the manufacturer reference for the selected variant. The existing exterior visualization is not certified as an exact representation of that trim."
      ]
    ],
    "lab": {
      "label": "Engine speed",
      "min": 600,
      "max": 6000,
      "value": 1800,
      "unit": "rpm"
    },
    "question": "How many crankshaft revolutions complete a four-stroke cycle in one cylinder?",
    "answers": [
      "One",
      "Two",
      "Four"
    ],
    "correct": 1,
    "explanation": "Four piston strokes span two crankshaft revolutions.",
    "source": [
      "Porsche · manufacturer reference",
      "https://newsroom.porsche.com/en/history/porsche-911-seven-generations-part-6-type-997-16489.html"
    ]
  }
];
export function lessonForPart(name){return lessons.find(l=>l.match.test(name))?.id||'body';}
export function labResult(id,value,cylinders=6){const v=value/3.6;switch(id){case'engine':return {value:Math.round(value/60*cylinders/2),unit:'power strokes / s',formula:`RPM / 60 × ${cylinders} cylinders / 2 revolutions`};case'wheels':return {value:Math.round(v/.32*60/(2*Math.PI)),unit:'rpm',formula:'ω = v / r · rolling radius 0.32 m'};case'brakes':return {value:Math.round(.5*1400*v*v/1000),unit:'kJ',formula:'E = ½mv² · illustrative mass 1,400 kg'};case'body':return {value:Math.round(.5*1.225*.30*2.2*v*v),unit:'N of drag',formula:'F = ½ρCdAv² · illustrative Cd 0.30'};case'glass':return {value:(Math.asin(Math.sin(value*Math.PI/180)/1.5)*180/Math.PI).toFixed(1),unit:'° refracted',formula:'sin θ₂ = sin θ₁ / 1.5 · air → glass'};case'lights':return {value:Math.round((5/value)**2*100),unit:'% illuminance',formula:'Relative to 5 m · ideal point source'};default:return {value:Math.round(75*10/(value/1000)),unit:'N average',formula:'Favg = mΔv / Δt · 75 kg, Δv = 10 m/s'};}}
export function introPose(seconds){const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};return {explode:seconds<5?smooth((seconds-2)/3):1-smooth((seconds-7)/3),angle:Math.min(seconds/10,1)*Math.PI*2,done:seconds>=10};}

export function lessonsForCourse(course){return lessons.map(base=>{
 const l={...base,sections:base.sections.map(s=>[...s])};
 if(l.id!=='engine')return l;
 l.name=course.engine;l.intro=`${course.reference}. ${course.architecture}.`;
 l.sections=[
 [`${course.cylinders} cylinders. One system.`,`${course.reference} is the selected course reference, using ${course.engineSpec}. Combustion pressure acts on pistons, connecting rods transmit force, and the crankshaft delivers rotary output. Valves, induction, lubrication, and cooling form part of the complete engine assembly.`,`The exact engine CAD is not yet available. The schematic substitute has been removed; no generic engine is presented as this car’s engine.`],
 ['Four strokes. Two revolutions.',`Each cylinder completes intake, compression, expansion, and exhaust in two crankshaft revolutions. For this ${course.cylinders}-cylinder four-stroke layout, the total power-stroke rate is RPM ÷ 60 × ${course.cylinders} ÷ 2. This counts events, not engine output.`,`Change engine speed to calculate the cycle rate. No firing-order or piston-motion simulation is shown without verified engine geometry.`],
 ['Packaging shapes performance.',course.engineDesign,'The exact component geometry must be sourced before dimensions, clearances, and internal arrangements can be inspected in 3D.'],
 ['An architecture, developed.',course.engineHistory,'Read the manufacturer reference for the selected variant. The existing exterior visualization is not certified as an exact representation of that trim.']
 ];l.source=[`${course.vehicle.make} · manufacturer reference`,course.referenceSource];return l;
});}

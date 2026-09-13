// Original monochrome assembly drawings. Shared IDs match the export BOM.
// These are visual instructions for a loose sample, not vehicle fitment drawings.
const ink='stroke="#111" stroke-width="1.5" fill="#fff" stroke-linejoin="round" stroke-linecap="round"';
const text=(x,y,value,size=14)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#111" stroke="none" font-family="Arial,Helvetica,sans-serif">${value}</text>`;
const svg=(label,body,view='0 0 360 230')=>`<svg viewBox="${view}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><g ${ink}>${body}</g></svg>`;
const at=(x,y,body,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})">${body}</g>`;
const arrow=(x,y,rotate=0)=>`<path transform="translate(${x} ${y}) rotate(${rotate})" d="M-4-24H4V-7H12L0 8-12-7H-4Z" fill="#111" stroke="none"/>`;
const cross=(x,y,size=14)=>`<path d="M${x-size} ${y-size}l${size*2} ${size*2}m0 ${-size*2}l${-size*2} ${size*2}" stroke-width="4"/>`;
const washer='<path d="M-27 0v5a27 9 0 0 0 54 0V0"/><ellipse rx="27" ry="9"/><ellipse rx="10" ry="3.8"/>';
const bolt='<path d="M-9 8v54q9 6 18 0V8"/><path d="M-9 21l18-6m-18 13l18-6m-18 13l18-6m-18 13l18-6m-18 13l18-6m-18 13l18-6m-18 13l18-6"/><path d="M-21-3l11-8 23 2 10 9-12 9-23-2Z"/><path d="M-21-3v10l9 9 23 2 12-9V0M-12 7v9M11 9v9"/>';
const nut='<path d="M-24 0l11-11 26 2 12 10-12 12-27-2Z"/><path d="M-24 0v14l10 12 27 2 12-13V1M-14 11v15M13 13v15"/><ellipse cy="1" rx="10" ry="5"/><path d="M-8 4q8-5 16 0" fill="none"/>';
const plate='<path d="M-55 0L0-16 55 0 0 20Z"/><path d="M-55 0v6L0 26 55 6V0M0 20v6"/><ellipse cy="1" rx="10" ry="4"/>';
const pad='<path d="M-35 0v5a35 12 0 0 0 70 0V0"/><ellipse rx="35" ry="12"/><ellipse rx="10" ry="4"/><path d="M-27 0l10-8m-6 13l21-16m0 19l26-19m-9 16l16-12" fill="none" stroke-width=".7"/>';
const sample='<path d="M-112 0L-5-30 111 0 4 35Z"/><path d="M-112 0v10L4 45 111 10V0M4 35v10"/><ellipse rx="10" ry="4"/><path d="M-95 8l5-5m5 8l5-5m5 8l5-5m5 8l5-5m5 8l5-5m5 8l5-5" stroke-width=".7"/>';
const ruler='<path d="M-75 0L62-38 77-30-60 9Z"/><path d="M-60-3l4 4m7-7l5 5m7-8l4 4m7-7l5 5m7-8l4 4m7-7l5 5m7-8l4 4m7-7l5 5m7-8l4 4m7-7l5 5"/>';
const car='<path d="M-88 16l5-30 28-12 26-29 63 3 35 30 27 12 8 27-18 9H-74Z"/><path d="M-51-26l29-22 51 2 27 24-52-2Z"/><path d="M3-46v22M-4-20v38m-66-29l-9 8m140-6l18 8"/><circle cx="-53" cy="20" r="17"/><circle cx="-53" cy="20" r="8"/><circle cx="59" cy="20" r="17"/><circle cx="59" cy="20" r="8"/>';
const document='<path d="M-37-48H17L37-28V50H-37Z"/><path d="M17-48v20h20M-22-13H22M-22 3H22M-22 19H22M-22 35H8"/>';

export function hardwareIllustration(id){
  const item={H1:at(90,29,bolt,1.3),H2:at(90,83,washer,1.5),H3:at(90,73,nut,1.5),H4:at(90,80,plate,1.3),H5:at(90,80,pad,1.5)}[id];
  return svg(`Line drawing of hardware ${id}`,item,'0 0 180 140');
}

export function connectionDrawing(){
  return svg('Exploded bolted sample with insertion arrows, part IDs and a circular hole close-up',`
    <path d="M190 40V552" stroke-dasharray="3 6" stroke-width="1"/>
    ${at(190,42,bolt)}${at(190,142,washer)}${at(190,227,sample)}${at(190,328,pad)}${at(190,398,plate)}${at(190,467,washer)}${at(190,518,nut)}
    ${arrow(115,125)}${arrow(115,205)}${arrow(115,315,180)}${arrow(115,389,180)}${arrow(115,456,180)}${arrow(115,523,180)}
    <g stroke-width=".8"><path d="M216 55h91m-86 88h86M253 249h54m-78 80h78m-57 72h57m-86 67h86m-86 65h86"/></g>
    ${text(321,60,'H1 · Bolt')}${text(321,148,'H2 · Washer')}${text(321,254,'P · Printed part')}${text(321,334,'H5 · Pad')}${text(321,406,'H4 · Backing plate')}${text(321,473,'H2 · Washer')}${text(321,538,'H3 · Locking nut')}
    <path d="M200 227L438 176" fill="none" stroke-width=".8"/>
    <circle cx="490" cy="123" r="58"/>${at(490,124,'<path d="M-44 0L-1-16 44 0 0 17Z"/><ellipse rx="15" ry="6"/><path d="M-15 0q15-8 30 0" fill="none"/>')}
    ${text(461,91,'Ø6.6',13)}${text(459,156,'example',10)}
    ${text(34,583,'Arrows show stack order — no tightening torque is specified.',12)}
  `,'0 0 560 605');
}

export function benchIllustration(kind){
  const drawings={
    identity:`${at(77,110,document,1.1)}${at(243,124,sample,.72)}<path d="M128 102h44" stroke-dasharray="4 4"/>${arrow(179,102,-90)}${text(53,178,'P01',18)}${text(223,180,'P01',18)}<circle cx="250" cy="47" r="27"/>${text(234,54,'1:1',19)}`,
    inspect:`${at(145,133,sample,.95)}${at(145,80,ruler,.95)}<path d="M178 143l93-71" fill="none"/><circle cx="290" cy="50" r="37"/><ellipse cx="290" cy="50" rx="20" ry="8"/><path d="M270 52q20-11 40 0" fill="none"/>${text(265,103,'clear hole',11)}<circle cx="280" cy="167" r="34"/><path d="M257 170l15-6 5 8 8-20 8 20 12-6" fill="none"/>${cross(280,166,23)}`,
    arrange:`${at(58,60,bolt,.85)}${at(160,90,washer,.95)}${at(270,82,nut,.9)}${at(103,173,plate,.9)}${at(247,176,pad,.9)}${text(40,31,'H1  1×',12)}${text(132,57,'H2  2×',12)}${text(246,47,'H3  1×',12)}${text(76,218,'H4  1×',12)}${text(220,218,'H5  1×',12)}`,
    assemble:`<path d="M145 38v145" stroke-dasharray="3 5"/>${at(145,44,bolt,.67)}${at(145,106,washer,.8)}${at(145,126,sample,.66)}${at(145,168,pad,.8)}${at(145,185,plate,.7)}${at(145,199,washer,.7)}${at(145,212,nut,.6)}${arrow(77,102)}${arrow(77,200,180)}<path d="M152 225L265 177" fill="none" stroke-width=".8"/><circle cx="288" cy="144" r="40"/>${at(286,126,nut,.75)}<path d="M265 159c-10 15 17 22 35 10" fill="none" stroke-width="2.5"/><path d="M299 162l7 5-8 5" fill="#111"/>${text(258,199,'hand-start',11)}${text(264,213,'loose only',11)}`,
    record:`${at(127,114,document,1.4)}<path d="M202 174l34-73 9-6 7 9-36 73-16 15Z"/><path d="M236 101l16 3m-50 70l14 3m-16 15l2-18"/>${text(230,59,'?',40)}${text(230,84,'fitment',12)}<path d="M87 150l8 7 12-19" fill="none" stroke-width="2"/>`,
    hold:`${at(174,144,car,1.2)}<circle cx="176" cy="131" r="88" fill="none" stroke-width="3"/><path d="M114 69L238 193" stroke-width="5"/>${text(76,30,'NO VEHICLE INSTALLATION',13)}`,
  };
  const labels={identity:'Match the part ID and check 100 percent scale',inspect:'Measure the loose prototype, inspect clear holes and reject cracks',arrange:'One connection requires one bolt, two washers, one nut, one plate and one pad',assemble:'Arrange the loose sample stack and hand-start only, without installation torque',record:'Record missing fitment measurements for review',hold:'Do not attach the concept to a vehicle'};
  return svg(labels[kind],drawings[kind]);
}

export function cautionDrawing(){return svg('Keep the concept on the workbench; do not install on a car',`
  <path d="M44 122L100 103 188 123 132 143Z"/><path d="M44 122v62m144-61v62m-56-42v55"/>
  ${at(115,103,sample,.43)}${at(115,51,bolt,.5)}${arrow(71,79)}
  <path d="M235 48v134" stroke-width=".6"/>${at(334,129,car,.72)}${cross(335,112,50)}${text(62,221,'BENCH CONCEPT',12)}${text(273,221,'NOT FOR THE CAR',12)}
`,'0 0 450 240');}

// Monochrome, diagram-first print edition. No fonts or images are fetched.
export const manualStyle=`
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif}svg{display:block;width:100%}
.page{max-width:900px;margin:28px auto;position:relative;display:flex;flex-direction:column}
.page-head{display:flex;justify-content:space-between;border-bottom:1px solid;padding-bottom:18px;gap:15px}
.facts{display:flex;border-top:1px solid;padding-top:20px}.facts b{display:block}
.parts,.two-col,.steps{display:grid;grid-template-columns:1fr 1fr}.part code{overflow-wrap:anywhere}
.warning strong{display:block;margin-bottom:6px}.warning p{margin:0}.box{border:1px solid}
.bom{width:100%;border-collapse:collapse}.bom th,.bom td{text-align:left;border-bottom:1px solid}.bom td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.step{border-top:1px solid;break-inside:avoid}.hold{text-align:center}.checklist{list-style:none;padding:0}
.checklist li{display:flex;gap:14px;border-bottom:1px solid}.checklist li:before{content:'□';font-size:20px}
footer{display:flex;justify-content:space-between;border-top:1px solid;gap:15px;letter-spacing:.3px}
.print-note{max-width:900px;margin:20px auto 0;text-align:center;padding:0 20px}
body{background:#e9e7e3;color:#111;font-size:13px;line-height:1.45}
.page{background:#fff;color:#111;padding:44px 50px;min-height:1080px;box-shadow:0 3px 18px #0000000d}
.page-head{font-size:10px;letter-spacing:1px;border-color:#aaa;color:#111;align-items:center}
.page-head>span:last-child{font-size:32px;font-weight:700;letter-spacing:-1px;line-height:1}
h1{font-size:68px;font-weight:700;line-height:1.02;letter-spacing:-3px;margin:30px 0 14px}
h2{font-size:38px;font-weight:700;letter-spacing:-1.5px;margin:24px 0 18px;line-height:1.1}
h3{font-weight:700;font-size:16px}p{color:#444;margin:8px 0}.small{font-size:11px}
.cover-subtitle{font-size:18px;color:#111}.hero-illustration{max-width:550px;margin:18px auto;width:100%}
.hero-illustration svg{max-height:570px}.cover-drawing{max-width:570px;margin:18px auto 28px;width:100%}
.cover-drawing svg{max-height:315px}.facts{border-color:#aaa;margin:15px 0;gap:36px}
.facts b{font-size:32px;font-weight:700}.facts span{color:#444;font-size:10px;letter-spacing:.3px}
.warning{border:1.5px solid #111;border-radius:12px;background:#fff;padding:16px 20px;margin:22px 0}
.warning strong{font-size:12px;letter-spacing:.3px}.warning p{color:#333;font-size:12px}
.warning strong:before{content:'!';display:inline-block;border:1.5px solid #111;border-radius:50%;width:19px;height:19px;text-align:center;line-height:17px;margin-right:9px}
.parts{gap:0 26px}.part{border:0;border-bottom:1px solid #aaa;padding:18px 0;break-inside:avoid}
.part-id{display:flex;justify-content:space-between;align-items:center;color:#111}.part-id b{font-size:17px}.part-id span{font-size:25px}
.part svg{height:150px;margin:10px 0}.part h3{font-size:13px;margin:8px 0 4px}.part p,.part code{font-size:10px;color:#555}
.hardware-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px;border-bottom:1px solid #aaa;padding:24px 0 20px}
.hardware-item{min-width:0}.hardware-item .part-id b{font-size:12px}.hardware-item .part-id span{font-size:24px}
.hardware-item svg{height:145px}.hardware-item p{font-size:11px;text-align:center;color:#111}
.bom{font-size:11px;margin:18px 0}.bom td,.bom th{padding:9px 6px;border-color:#ccc}.bom th{font-size:9px;letter-spacing:.4px}
.bom td:first-child{font-weight:700;white-space:nowrap}.box{padding:16px;border-color:#aaa;margin:14px 0}.box p{font-size:11px}
.two-col{gap:22px}.two-col .box{margin:8px 0}.two-col .box h3{font-size:13px;margin:0 0 7px}
.steps{gap:20px 28px}.step{display:block;border-color:#aaa;padding:14px 0 0}.step-heading{display:flex;align-items:center;gap:15px}
.step-heading b{font-size:32px;line-height:1;font-weight:700;color:#111}.step-heading h3{font-size:14px;margin:0}
.step svg{height:190px;margin:12px auto 4px}.step p{font-size:11px;line-height:1.45;margin:7px 0}
.hold{font-size:14px;font-weight:700;border:2px solid #111;border-radius:10px;padding:14px;margin:20px 0;letter-spacing:1px}
.checklist li{padding:12px 0;font-size:12px;border-color:#ccc}.checklist li:before{color:#111}
.ref{margin:15px 0}.ref a{color:#111;font-size:12px}.ref p{font-size:11px}
footer{color:#444;border-color:#aaa;font-size:9px;padding-top:14px;margin-top:auto}
.print-note{color:#555;font-size:11px}.muted{color:#555}
@media(max-width:700px){.page{padding:25px 23px;min-height:0;margin:12px}.page-head{font-size:8px}.page-head>span:last-child{font-size:26px}h1{font-size:49px;letter-spacing:-2px}h2{font-size:31px}.cover-subtitle{font-size:15px}.parts,.two-col,.steps{grid-template-columns:1fr}.part svg{height:165px}.hardware-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.hardware-item svg{height:110px}.hardware-item .part-id span{font-size:20px}.facts{gap:20px}.facts span{font-size:8px}.facts b{font-size:27px}.step svg{height:220px}.hero-illustration svg{max-height:570px}footer{margin-top:32px;font-size:7px}.bom{font-size:10px}}
@media print{@page{size:A4;margin:10mm}.page{min-height:276mm;padding:6mm 7mm;margin:0;box-shadow:none;break-after:page}.page:last-child{break-after:auto}.page-head>span:last-child{font-size:25pt}h1{font-size:47pt}h2{font-size:27pt}.cover-drawing svg{height:65mm}.parts,.steps,.two-col{grid-template-columns:1fr 1fr}.part svg{height:35mm}.hardware-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:3mm}.hardware-item svg{height:29mm}.hero-illustration svg{height:126mm}.step svg{height:32mm}.steps{gap:4mm 6mm}.step{padding-top:3mm}.step p{font-size:8pt}.step-heading b{font-size:23pt}.warning{margin:4mm 0;padding:3mm 4mm}.box{margin:3mm 0;padding:3mm}.facts{padding-top:4mm}.checklist li{padding:3mm 0}.print-note{display:none}footer{margin-top:auto;font-size:6pt}.page-head,footer{break-inside:avoid}.part,.hardware-item,.box,.warning{break-inside:avoid}}
`;

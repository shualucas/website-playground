/** Map a flat element onto the four projected corners of its printed note. */
export function noteTransform(corners, rect) {
  const p=corners.map(({x,y})=>({x:x-rect.left,y:y-rect.top}));
  const [a,b,c,d]=p,dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x;
  const dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y;
  const det=dx1*dy2-dx2*dy1;
  if(Math.abs(det)<.001)return `translate(${a.x}px,${a.y}px) scale(.1)`;
  const g=(dx3*dy2-dx2*dy3)/det,h=(dx1*dy3-dx3*dy1)/det;
  return `matrix3d(${(b.x-a.x+g*b.x)/rect.width},${(b.y-a.y+g*b.y)/rect.width},0,${g/rect.width},${(d.x-a.x+h*d.x)/rect.height},${(d.y-a.y+h*d.y)/rect.height},0,${h/rect.height},0,0,1,0,${a.x},${a.y},0,1)`;
}
export function noteFrames(pose, rect) {
  if(!pose?.corners)return [{opacity:0,transform:'translateY(18px) rotate(-3deg) scale(.92)'},{opacity:1,transform:'none'}];
  const target=[{x:rect.left,y:rect.top},{x:rect.right,y:rect.top},{x:rect.right,y:rect.bottom},{x:rect.left,y:rect.bottom}];
  const peeled=pose.corners.map((point,i)=>({x:point.x+(target[i].x-point.x)*.1,y:point.y+(target[i].y-point.y)*.1-(point.free?26:3)}));
  const lifted=pose.corners.map((point,i)=>({x:point.x+(target[i].x-point.x)*.62,y:point.y+(target[i].y-point.y)*.62-38}));
  return [
    {offset:0,transform:noteTransform(pose.corners,rect),boxShadow:'0 1px 2px #0001'},
    {offset:.18,transform:noteTransform(peeled,rect),boxShadow:'0 8px 18px #0001'},
    {offset:.58,transform:noteTransform(lifted,rect),boxShadow:'0 38px 65px #0002'},
    {offset:.88,transform:'translateY(-3px) rotate(.4deg) scale(1.012)',boxShadow:'0 24px 60px #0002'},
    {offset:1,transform:'none',boxShadow:'0 18px 48px #0002'},
  ];
}

import React, { useEffect, useState } from 'react';
// Display an actual device-local count. No fabricated global baseline or random increments.
export const VisitCounter: React.FC = () => {
  const [count,setCount] = useState<number|null>(null);
  useEffect(()=>{const timer=setTimeout(()=>{try{const key='bienthedethi-edugenvn_my_visits';const value=Number(localStorage.getItem(key)||0);const next=(Number.isFinite(value)?value:0)+1;localStorage.setItem(key,String(next));setCount(next);}catch{}},400);return()=>clearTimeout(timer);},[]);
  return count===null?null:<p className="visit-counter">{count.toLocaleString('vi-VN')} lượt mở trên thiết bị này</p>;
};

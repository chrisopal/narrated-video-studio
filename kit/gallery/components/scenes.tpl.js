window.FILM={theme:'__THEME__',chrome:'__CHROME__',chapters:['1969｜人名条 年代 时间轴 引文','1969｜数字 柱图 参数表 标注','1972｜流程 对比 荧光笔','1972｜折线 视频片段','1975｜章节卡'],
 cover:{pill:'组件总览',title:'讲解视频工坊',line1:'主题：__THEME__',line2:'通用组件',tagline:'测试用',art(c,cx,cy,R){c.strokeStyle=TH.a1;c.lineWidth=10;c.beginPath();c.arc(cx,cy,R,0,7);c.stroke()}},
 scenes(t){
  scn(t,T('a0'),N('a0'),()=>{const s=T('a0');dateStamp(t,s+.3,'1969','阿波罗 11 号登月',110,330);
   timeline(t,s+.8,[{tag:'1957',label:'第一颗人造卫星',at:s+1.2},{tag:'1961',label:'人类进入太空',at:s+1.8},{tag:'1969',label:'登上月球',at:s+2.4},{tag:'1972',label:'最后一次登月',at:s+9}],{y:620,x0:760,x1:1820});
   quoteCard(t,s+1,'这是个人的一小步，却是人类的一大步。','尼尔·阿姆斯特朗，1969 年 7 月 20 日',110,430,600,{sz:44});lowerThird(t,s+1.5,'尼尔·阿姆斯特朗','阿波罗 11 号指令长',110,880);stamp(t,s+3,'已核实',1560,300);sourceTag(t,s+2,'来源：NASA 任务记录',760,880)});
  scn(t,T('b0'),N('b0'),()=>{const s=T('b0');bigNumber(t,s+1.2,{value:384400,unit:'公里',label:'地球到月球的平均距离',note:'来源：NASA'},520,430,170);
   barChart(t,s+.5,[{label:'滑动',value:0.1},{label:'滚动',value:0.002,hi:true},{label:'油膜',value:0.01}],110,540,820,400,{title:'摩擦系数（示意数据）',decimals:3,source:'示意，非真实数据'});
   specTable(t,s+.6,[['内径','25 mm'],['外径','52 mm'],['宽度','15 mm'],['额定转速','14 000 转/分']],1080,560,720,{title:'6205 深沟球轴承（示意）'});
   g.strokeStyle=TH.ink;g.lineWidth=6;g.beginPath();g.arc(1300,330,150,0,7);g.stroke();g.beginPath();g.arc(1300,330,80,0,7);g.stroke();callout(t,s+1,1300,180,1560,150,'外圈','固定在机座上');callout(t,s+1.4,1300,250,1560,330,'滚动体','钢球');callout(t,s+1.8,1245,330,1010,300,'内圈','随轴转动')});
  scn(t,T('c0'),N('c0'),()=>{const s=T('c0');flowSteps(t,[{label:'下料',sub:'棒料切段',at:s+.4},{label:'锻造',sub:'加热后成形',at:s+.9},{label:'车削',sub:'加工到接近尺寸',at:s+1.4},{label:'热处理',sub:'淬火提高硬度',at:s+1.9},{label:'磨削',sub:'精度到微米级',at:s+2.4}],110,180,1700);
   compare2(t,s+1,{title:'滑动摩擦',lines:['面和面直接蹭','阻力大','发热多']},{title:'滚动摩擦',lines:['中间隔着滚珠','阻力小得多','更省力']},{y:420,h:470,tR:s+1.6});highlight(t,s+3,1110,700,420,52)});
  scn(t,T('d0'),N('d0'),()=>{const s=T('d0');lineChart(t,s+.4,[{label:'2019',v:12},{label:'2020',v:9},{label:'2021',v:15},{label:'2022',v:22},{label:'2023',v:31},{label:'2024',v:44}],110,180,820,640,{title:'年产量（万件，示意数据）',unit:'',dur:3,marks:[{i:1,label:'停产两个月'}],source:'示意，非真实数据'});
   clip('demo',t,s+.5,1040,220,780,439,{sound:.5});txt('视频片段：按时间取帧，可任意跳帧',1430,730,36,TH.ink,TH.f.b,'center');credits(t,s+1,creditLines(),800)});
  chapterCard(t,T('e0')+.2,T('e0')+7.5,3,'章节卡标题','这里写一句这一章要回答的问题');
 }};

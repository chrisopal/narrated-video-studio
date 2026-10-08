(() => {
const { chainMap, robotBody, exploded, shareRing, vsLocal, iconWall, heading, badge, on } = PACK.industry;

// 虚构企业：栖石精密传动。所有数字都是示意。
const CO = '栖石精密传动';
const TIERS = [
  { name: '上游 · 材料', items: ['特种钢材', '工程塑料', '润滑材料'] },
  { name: '核心零部件', items: ['小减速器', '伺服电机', '传感器'] },
  { name: '整机', items: ['人形机器人', '工业机械臂'] },
  { name: '下游 · 应用', items: ['汽车工厂', '仓储物流', '家庭服务'] },
];
const PARTS = [
  { shape: 'housing', r: 172, r2: 130, w: 70, name: '外壳' },
  { shape: 'ringGear', r: 126, r2: 104, w: 56, teeth: 64, name: '刚性齿圈' },
  { shape: 'flex', r: 100, r2: 92, w: 150, teeth: 60, spin: -.12, name: '柔性齿轮' },
  { shape: 'wave', r: 86, w: 40, spin: 1.1, name: '波发生器' },
];
const APPS = [
  { icon: 'car', label: '汽车' }, { icon: 'robot', label: '机器人' }, { icon: 'phone', label: '消费电子' }, { icon: 'plane', label: '航空' },
  { icon: 'wind', label: '风电' }, { icon: 'medical', label: '医疗器械' }, { icon: 'factory', label: '工厂产线' }, { icon: 'chip', label: '芯片设备' },
];

window.FILM = {
  theme: 'industry', chrome: 'none', chapters: ['关节', '产业链', '拆开看', '份额与替代', '下游'],
  cover: { pill: '风格包样片', title: '产业图谱', line1: '关节 · 产业链 · 爆炸图', line2: '虚构企业，数据为示意', tagline: CO + '（虚构）：机器人关节里的小减速器',
    art(c, cx, cy, R) { on(c, () => robotBody(9, 0, { x: cx, y: cy + R * 1.08, h: R * 2.1, hi: ['shoulder', 'elbow', 'knee'], hiAt: 0, idle: false })); } },
  scenes(t) {
    const T0 = T('a0'), T1 = T('a1'), T2 = T('a2'), T3 = T('a3'), T4 = T('a4');
    // 常驻声明
    badge(t, .3, CO + '为虚构企业，数据为示意', 1830, 104, { al: 'right' });

    // a0 人形机器人：线稿出现，关节逐个点亮
    scn(t, T0 - .6, N('a0'), () => {
      heading(t, T0 + .1, '人形机器人的关节里，藏着小减速器');
      robotBody(t, T0, { x: 960, y: 905, h: 690, hi: ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'], hiAt: T0 + 1.2, stagger: .32,
        labels: { shoulder: '大扭矩关节', wrist: '小而精的关节', knee: '这里要用减速器' }, side: { shoulder: 'r', wrist: 'l', knee: 'r' } });
    });

    // a1 产业链：它在“核心零部件”这一层
    scn(t, T1, N('a1'), () => {
      heading(t, T1 + .1, '产业链：' + CO + '在哪一层');
      chainMap(t, T1 + .3, { tiers: TIERS, focus: '小减速器', label: CO, x: 110, y: 240, w: 1700, h: 640, stagger: .45, flow: true });
    });

    // a2 减速器爆炸图
    scn(t, T2, N('a2'), () => {
      heading(t, T2 + .1, '拆开看：一台小减速器');
      exploded(t, T2 + .2, N('a2') - T2 - .2, PARTS, { x: 960, y: 560, axis: 'x', gap: 270, focus: '柔性齿轮' });
      badge(t, T2 + .6, '示意图，未按比例', 1830, 900, { al: 'right' });
    });

    // a3 份额（示意）+ 进口 / 国产
    scn(t, T3, N('a3'), () => {
      heading(t, T3 + .1, '份额与替代');
      shareRing(t, T3 + .3, [{ name: '栖石', value: 18 }, { name: '企业甲', value: 41 }, { name: '企业乙', value: 23 }, { name: '其他', value: 18 }],
        { focus: '栖石', x: 500, y: 520, r: 180, dur: 1.3 });
      vsLocal(t, T3 + 1.5, { left: { title: '进口方案', lines: ['技术成熟', '价格偏高', '交期较长'] }, right: { title: '国产方案', lines: ['快速追赶', '性价比高', '响应更快'] },
        x: 1000, y: 345, w: 820, gap: 70, tR: T3 + 1.9, stagger: .3 });
      badge(t, T3 + 2.4, '对比为示意，不针对具体企业', 1820, 790, { al: 'right' });
    });

    // a4 下游应用
    scn(t, T4, N('a4') + 3, () => {
      heading(t, T4 + .1, '下游：这些行业都用得上');
      iconWall(t, T4 + .4, APPS, { y: 210, size: 190, gap: 60, hi: '机器人', stagger: .14 });
      rise(t, T4 + 1.9, '看不见的小零件，撑起看得见的整机', W / 2, 892, 44, TH.a1, TH.f.t, 'center');
    });
  },
};
})();

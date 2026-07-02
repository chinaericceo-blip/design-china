/* ===== design.中国 - Vue 3 平台级应用 ===== */

const { createApp, ref, computed, watch, onMounted } = Vue;

/* ---- localStorage 持久化 ---- */
function save(key,val){ try{ localStorage.setItem('dc_'+key, JSON.stringify(val)); }catch(e){} }
function load(key,def){ try{ const v=localStorage.getItem('dc_'+key); return v!==null?JSON.parse(v):def; }catch(e){return def;} }

const app = createApp({
  setup() {
    /* ---- 路由 ---- */
    const route = ref('home');
    const routes = ['home','works','services','demands','news','events','profile','user','spatial','visual','materials','courses','brand'];
    function navigate(r) { route.value = r; window.scrollTo(0,0); closeMenu(); }
    function isActive(r) { return route.value === r; }
    const menuOpen = ref(false);
    function toggleMenu() { menuOpen.value = !menuOpen.value; }
    function closeMenu() { menuOpen.value = false; }

    /* ---- Toast ---- */
    const toastMsg = ref('');
    function showToast(msg, dur=2500) { toastMsg.value=msg; setTimeout(()=>toastMsg.value='',dur); }

    /* ---- 首页搜索 ---- */
    const homeSearch = ref('');
    function doHomeSearch(){
      if(!homeSearch.value.trim()) return;
      worksSearch.value = homeSearch.value.trim(); navigate('works');
    }

    /* ===================================================
       ========== 会员系统 ==========
       =================================================== */
    const currentUser = ref(load('currentUser', null));
    const allUsers = ref(load('allUsers', {}));
    const isLoggedIn = computed(()=>currentUser.value!==null);

    // 登录弹窗
    const authOpen = ref(false);
    const authTab = ref('login'); // login | register
    const authPhone = ref('');
    const authCode = ref('');
    const authSending = ref(false);
    const authCountdown = ref(0);
    const authWechat = ref(false);
    let smsTimer = null;

    function openAuth() { authOpen.value=true; authTab.value='login'; authPhone.value=''; authCode.value=''; authWechat.value=false; }
    function closeAuth() { authOpen.value=false; if(smsTimer) clearInterval(smsTimer); authCountdown.value=0; authSending.value=false; }

    function sendSMS(){
      if(!/^1[3-9]\d{9}$/.test(authPhone.value)){ showToast('请输入正确的手机号');return; }
      authSending.value=true; authCountdown.value=60;
      smsTimer = setInterval(()=>{
        authCountdown.value--;
        if(authCountdown.value<=0){ clearInterval(smsTimer); authSending.value=false; }
      },1000);
      showToast('验证码已发送（模拟：输入 123456）');
    }

    function doAuth(){
      if(!/^1[3-9]\d{9}$/.test(authPhone.value)){ showToast('请输入正确的手机号');return; }
      if(authCode.value.length<4){ showToast('请输入验证码');return; }
      // 模拟验证：任意 4-6 位验证码都通过
      const phone = authPhone.value;
      const all = {...allUsers.value};
      if(authTab.value==='register'){
        if(all[phone]){ showToast('该手机号已注册，请直接登录'); authTab.value='login'; return; }
        all[phone] = {
          id:'u_'+Date.now(), phone,
          name:'设计师_'+phone.slice(-4),
          avatar:'🎨', handle:'designer_'+phone.slice(-4),
          bio:'', title:'', company:'', tags:[], contact:'',
          wechatBound: authWechat.value,
          promotedWorks: [], // 付费推广的作品ID列表
          works: [], // 自己上传的作品ID
          createdAt: new Date().toISOString()
        };
        allUsers.value = all; save('allUsers', all);
        currentUser.value = all[phone]; save('currentUser', all[phone]);
        showToast('🎉 注册成功！欢迎加入 design.中国');
      } else {
        if(!all[phone]){ showToast('该手机号未注册，请先注册'); authTab.value='register'; return; }
        if(authWechat.value) all[phone].wechatBound = true;
        allUsers.value = all; save('allUsers', all);
        currentUser.value = all[phone]; save('currentUser', all[phone]);
        showToast('👋 欢迎回来，'+all[phone].name);
      }
      closeAuth(); navigate('home');
    }

    function doLogout(){
      currentUser.value = null; save('currentUser', null);
      showToast('已退出登录'); closeUserMenu(); navigate('home');
    }

    // 头像下拉
    const userMenuOpen = ref(false);
    function toggleUserMenu(){ userMenuOpen.value=!userMenuOpen.value; }
    function closeUserMenu(){ userMenuOpen.value=false; }

    // 更新当前用户数据
    function updateUser(updates){
      if(!currentUser.value) return;
      const phone = currentUser.value.phone;
      const all = {...allUsers.value};
      Object.assign(currentUser.value, updates);
      Object.assign(all[phone], updates);
      allUsers.value = all;
      save('allUsers', all);
      save('currentUser', currentUser.value);
    }

    /* ===== 资料编辑 ===== */
    const editProfile = ref(false);
    const editForm = ref({name:'',avatar:'',title:'',company:'',bio:'',tags:'',contact:''});
    function openEditProfile(){
      const u = currentUser.value;
      editForm.value = { name:u.name||'', avatar:u.avatar||'🎨', title:u.title||'', company:u.company||'', bio:u.bio||'', tags:(u.tags||[]).join('、'), contact:u.contact||'' };
      editProfile.value=true;
    }
    function saveProfile(){
      const tags = editForm.value.tags.split(/[,，、\s]+/).filter(Boolean);
      updateUser({
        name: editForm.value.name || currentUser.value.name,
        avatar: editForm.value.avatar || currentUser.value.avatar,
        title: editForm.value.title,
        company: editForm.value.company,
        bio: editForm.value.bio,
        tags: tags,
        contact: editForm.value.contact
      });
      editProfile.value = false;
      showToast('个人资料已更新');
    }

    const avatarOptions = '🎨🏛️🏗️📐✏️🖌️💡🎯🚀🌟🔥💎👤🎭🎪'.split('');

    /* ===== 付费推广 ===== */
    const promoOpen = ref(false);
    const selectedPromo = ref(null);
    const promoPlans = [
      {id:'basic', name:'基础曝光', icon:'📌', price:299, unit:'元/周', features:['首页推荐位展示','案例库优先排序','7天有效曝光','基础数据统计'], recommended:false},
      {id:'pro', name:'专业推广', icon:'🚀', price:999, unit:'元/周', features:['首页Banner展示','搜索结果置顶','精准分类推荐','详细数据分析','潜在客户匹配'], recommended:true},
      {id:'ultimate', name:'全站霸屏', icon:'👑', price:2999, unit:'元/周', features:['全站最高优先级展示','全分类搜索置顶','首页+各频道Banner','专属设计师主页推荐','客户直接联系通道','月度推广效果报告'], recommended:false}
    ];

    function openPromo(){ promoOpen.value=true; }
    function closePromo(){ promoOpen.value=false; selectedPromo.value=null; }
    function buyPromo(plan){
      selectedPromo.value=plan;
    }
    function confirmPromo(){
      if(!currentUser.value) return;
      const u = currentUser.value;
      const promoted = [...(u.promotedWorks||[])];
      promoted.push({
        plan: selectedPromo.value.id,
        planName: selectedPromo.value.name,
        price: selectedPromo.value.price,
        startAt: new Date().toISOString(),
        expireAt: new Date(Date.now()+7*86400000).toISOString()
      });
      updateUser({ promotedWorks: promoted });
      showToast('🎉 付费推广已生效！您的作品将在全站优先展示');
      closePromo();
    }
    function isPromoted(workId){
      if(!currentUser.value) return false;
      const now = Date.now();
      return (currentUser.value.promotedWorks||[]).some(p=>new Date(p.expireAt).getTime()>now);
    }

    /* ===== 查看用户主页 ===== */
    const viewingUser = ref(null);
    function viewUserProfile(userId){
      const all = allUsers.value;
      const u = Object.values(all).find(u=>u.id===userId);
      if(u){ viewingUser.value=u; navigate('user'); }
    }

    /* ===================================================
       ========== 作品库模块 ==========
       =================================================== */
    const worksFilter = ref('all');
    const worksSearch = ref('');
    const worksSort = ref('latest');
    const showUpload = ref(false);
    const selectedWork = ref(null);
    const uploadData = ref({title:'',cat:'',desc:'',tags:''});

    const workCats = [
      {key:'all',label:'全部案例'},
      {key:'architecture',label:'建筑设计'},
      {key:'interior',label:'室内设计'},
      {key:'landscape',label:'景观园林'},
      {key:'product',label:'工业产品'},
      {key:'graphic',label:'平面视觉'},
    ];

    // 加载持久化作品
    const savedWorks = load('works', null);
    const defaultWorks = [
      {id:'w1',title:'三亚海棠湾度假酒店深化设计',cat:'architecture',icon:'🏨',desc:'从方案深化到施工图全过程，涵盖客房、大堂、餐厅等全部空间，精确到每一个节点的构造设计。',author:'张工团队',authorId:null,date:'2026-06',likes:1247,liked:false,promoted:false},
      {id:'w2',title:'深圳腾讯滨海总部办公空间',cat:'interior',icon:'🏢',desc:'18,000平方米总部大楼室内施工图，包括开放办公、阶梯会议、休闲协作区等多元功能空间。',author:'李设计',authorId:null,date:'2026-05',likes:986,liked:false,promoted:false},
      {id:'w3',title:'北京SKP-S商业空间设计',cat:'interior',icon:'🛍️',desc:'25,000平米沉浸式商业空间，从概念到施工图落地的完整系统文档。',author:'王设计院',authorId:null,date:'2026-04',likes:1532,liked:false,promoted:false},
      {id:'w4',title:'上海汤臣一品顶层复式',cat:'interior',icon:'🏠',desc:'860平米超高层复式豪宅全套施工图，涵盖所有细部节点和材料选型标准。',author:'陈工',authorId:null,date:'2026-03',likes:876,liked:false,promoted:false},
      {id:'w5',title:'杭州云栖小镇会展中心',cat:'architecture',icon:'🏛️',desc:'12,000平米会展综合体施工图设计，包含大跨度钢结构与大空间功能配置。',author:'杭州院',authorId:null,date:'2026-02',likes:654,liked:false,promoted:false},
      {id:'w6',title:'成都泰康之家养老社区',cat:'architecture',icon:'🏥',desc:'45,000平米CCRC养老社区施工图，无障碍设计标准、适老化细节全覆盖。',author:'康养团队',authorId:null,date:'2026-01',likes:543,liked:false,promoted:false},
      {id:'w7',title:'广州K11购物艺术中心',cat:'interior',icon:'🏗️',desc:'28,000平米高端艺术购物中心深化设计，多首层空间与艺术装置融合节点。',author:'华南院',authorId:null,date:'2025-12',likes:789,liked:false,promoted:false},
      {id:'w8',title:'南京艺术学院美术馆',cat:'architecture',icon:'🎓',desc:'9,600平米文化教育展陈空间，精密展墙系统与灯光控制施工图。',author:'江苏设计院',authorId:null,date:'2025-11',likes:432,liked:false,promoted:false},
      {id:'w9',title:'苏州工业园区景观规划',cat:'landscape',icon:'🌿',desc:'园区全域景观规划与施工图，将江南水乡元素与现代产业园功能完美结合。',author:'园林团队',authorId:null,date:'2026-06',likes:1102,liked:false,promoted:false},
      {id:'w10',title:'智能家居控制面板设计',cat:'product',icon:'🎛️',desc:'全屋智能控制面板工业设计，从概念草图到量产工程图的完整设计输出。',author:'产品设计组',authorId:null,date:'2026-05',likes:876,liked:false,promoted:false},
      {id:'w11',title:'上海外滩金融中心VI系统',cat:'graphic',icon:'🎨',desc:'全套品牌视觉识别系统设计，涵盖logo延展、导视系统、数字端视觉规范。',author:'品牌部',authorId:null,date:'2026-04',likes:1345,liked:false,promoted:false},
      {id:'w12',title:'武汉东湖绿道规划',cat:'landscape',icon:'🚴',desc:'28公里滨湖绿道施工图，含骑行道、步行道、驿站节点的完整景观体系。',author:'湖北院',authorId:null,date:'2026-03',likes:567,liked:false,promoted:false},
    ];
    const works = ref(savedWorks||defaultWorks);

    // 保存作品
    watch(works, (v)=>{ save('works', v); }, {deep:true});

    const filteredWorks = computed(()=>{
      let w = [...works.value];
      // 付费推广的作品排最前
      w.sort((a,b)=>{
        const aP=a.promoted?1:0, bP=b.promoted?1:0;
        if(aP!==bP) return bP-aP;
        return 0;
      });
      if(worksFilter.value!=='all') w=w.filter(w=>w.cat===worksFilter.value);
      if(worksSearch.value) w=w.filter(w=>w.title.includes(worksSearch.value)||w.author.includes(worksSearch.value));
      if(worksSort.value==='popular') w.sort((a,b)=>{ const aP=a.promoted?1:0, bP=b.promoted?1:0; if(aP!==bP) return bP-aP; return b.likes-a.likes; });
      else if(worksSort.value==='oldest') w.reverse();
      return w;
    });

    function likeWork(work) { if(!isLoggedIn.value){showToast('请先登录再点赞');openAuth();return;} work.liked=!work.liked; work.likes+=work.liked?1:-1; }
    function openWork(work) { selectedWork.value=work; }
    function closeWork() { selectedWork.value=null; }

    function submitUpload(){
      if(!isLoggedIn.value){ showToast('请先登录再发布作品'); openAuth(); return; }
      if(!uploadData.value.title||!uploadData.value.cat){showToast('请填写作品名称和分类');return;}
      const newWork = {
        id:'w_'+Date.now(),
        title:uploadData.value.title,
        cat:uploadData.value.cat,
        icon:'📤',
        desc:uploadData.value.desc||'待补充作品描述',
        author:currentUser.value.name,
        authorId:currentUser.value.id,
        date:new Date().toISOString().slice(0,7),
        likes:0, liked:false, promoted:false
      };
      works.value.unshift(newWork);
      // 同步到用户数据
      const u = currentUser.value;
      const userWorks = [...(u.works||[]), newWork.id];
      updateUser({works:userWorks});
      showToast('作品发布成功！');
      uploadData.value={title:'',cat:'',desc:'',tags:''};
      showUpload.value=false;
    }

    // 推广作品
    function promoteWork(workId){
      if(!isLoggedIn.value){ showToast('请先登录'); openAuth(); return; }
      const w = works.value.find(w=>w.id===workId);
      if(w){ w.promoted=!w.promoted; }
      const promoted = [...(currentUser.value.promotedWorks||[])];
      if(w.promoted){
        promoted.push({plan:'custom',planName:'作品推广',price:0,workId,startAt:new Date().toISOString(),expireAt:new Date(Date.now()+7*86400000).toISOString()});
      } else {
        const idx = promoted.findIndex(p=>p.workId===workId);
        if(idx>-1) promoted.splice(idx,1);
      }
      updateUser({promotedWorks:promoted});
      showToast(w.promoted?'推广已开启':'推广已取消');
    }

    /* ===================================================
       ========== 服务交易模块 ==========
       =================================================== */
    const serviceView = ref('list');
    const selectedService = ref(null);
    const orderForm = ref({name:'',phone:'',desc:'',budget:''});

    const services = ref([
      {id:'s1',title:'施工图深化设计',icon:'📐',desc:'从方案图纸到可交付施工图的全过程服务，包含平面、立面、节点大样等全部图纸。',price:'30-80',unit:'元/㎡',tags:['酒店','办公','商业','住宅'],delivery:'15-30工作日'},
      {id:'s2',title:'BIM建模与碰撞检测',icon:'🏗️',desc:'全专业BIM模型搭建，自动碰撞检测与优化建议，输出符合国标的模型文件。',price:'15-40',unit:'元/㎡',tags:['Revit','碰撞检测','管线综合'],delivery:'10-20工作日'},
      {id:'s3',title:'方案深化设计',icon:'✏️',desc:'在概念方案基础上进行空间深化，完善功能布局、材料选型、色彩搭配方案。',price:'50-150',unit:'元/㎡',tags:['概念深化','效果图','材料选型'],delivery:'7-14工作日'},
      {id:'s4',title:'竣工图编制',icon:'✅',desc:'根据工程实际情况编制符合归档要求的竣工图纸，确保与现场一致。',price:'10-25',unit:'元/㎡',tags:['竣工归档','现场复核','图审配合'],delivery:'10-20工作日'},
      {id:'s5',title:'室内效果图制作',icon:'🖼️',desc:'高精度3D渲染效果图，支持多角度、多时段光照模拟，材质真实还原。',price:'2000-5000',unit:'元/张',tags:['3D Max','V-Ray','全景渲染'],delivery:'3-5工作日'},
      {id:'s6',title:'图纸审核咨询',icon:'🔍',desc:'专业施工图审核服务，检查图纸合规性、专业协调性，出具审核意见报告。',price:'5000-20000',unit:'元/次',tags:['合规审查','多专业协审','意见报告'],delivery:'3-7工作日'},
    ]);

    function selService(s){
      if(!isLoggedIn.value){ showToast('请先登录再下单'); openAuth(); return; }
      selectedService.value=s; serviceView.value='order';
      orderForm.value={name:currentUser.value.name||'',phone:currentUser.value.phone||'',desc:'',budget:''};
      window.scrollTo(0,180);
    }
    function submitOrder(){
      if(!orderForm.value.name||!orderForm.value.phone){showToast('请填写姓名和联系方式');return;}
      showToast('需求已提交！我们将在24小时内与您联系');
      serviceView.value='list';
    }

    /* ===================================================
       ========== 需求发布模块 ==========
       =================================================== */
    const demandView = ref('form');
    const demandForm = ref({type:'',title:'',desc:'',budget:50000,location:'',contact:'',phone:''});
    const demandTypes = [
      {key:'interior',icon:'🏠',label:'室内设计'},{key:'construction',icon:'📐',label:'施工图深化'},
      {key:'architecture',icon:'🏛️',label:'建筑设计'},{key:'landscape',icon:'🌳',label:'景观设计'},
      {key:'product',icon:'📱',label:'工业设计'},{key:'branding',icon:'🎨',label:'品牌视觉'},
    ];
    const matchResults = ref([]);
    function selDemandType(key){ demandForm.value.type=key; }
    function submitDemand(){
      if(!demandForm.value.type||!demandForm.value.title||!demandForm.value.contact){showToast('请填写必填项');return;}
      matchResults.value=[
        {name:'张工深化设计团队',rate:'98%',exp:'12年施工图经验',projects:'酒店/办公领域300+案例',initials:'张'},
        {name:'华南建筑深化中心',rate:'95%',exp:'8年专注商业空间',projects:'大型商业综合体案例丰富',initials:'华'},
        {name:'深度设计工作室',rate:'92%',exp:'5年全案深化',projects:'五星级酒店项目经验',initials:'深'},
        {name:'匠人制图团队',rate:'89%',exp:'10年行业积累',projects:'施工图标准化流程成熟',initials:'匠'},
      ];
      demandView.value='match'; window.scrollTo(0,180);
    }

    /* ===================================================
       ========== 行业动态+赛事 ==========
       =================================================== */
    const newsTab = ref('news');
    const articles = ref([
      {title:'2026中国室内设计趋势报告：可持续与智能化并行',date:'2026-06-28',source:'wx',sourceName:'公众号',desc:'从材料革新到空间智能化，2026年室内设计行业正迎来新一轮范式变革...'},
      {title:'住建部发布新版《建筑内部装修设计防火规范》',date:'2026-06-22',source:'platform',sourceName:'官方发布',desc:'新规对公共建筑内部装修材料的燃烧性能等级提出更高要求...'},
      {title:'施工图深化设计：从成本中心到价值创造的转身',date:'2026-06-15',source:'zh',sourceName:'知乎',desc:'在当前市场环境下，施工图深化设计正在从单纯的"画图"服务...'},
      {title:'AI辅助施工图设计：效率提升还是行业替代？',date:'2026-06-08',source:'zh',sourceName:'知乎',desc:'多款AI制图工具上线，施工图领域正经历技术冲击波...'},
      {title:'设计赋能商业：2026年度十大设计驱动型商业空间',date:'2026-05-30',source:'wx',sourceName:'公众号',desc:'盘点2026上半年通过设计驱动商业价值跃升的标杆空间案例...'},
      {title:'从BIM到CIM：数字孪生技术在设计行业的应用前沿',date:'2026-05-20',source:'platform',sourceName:'design.中国',desc:'数字孪生从概念走向落地，BIM技术正向城市级CIM延伸...'},
    ]);
    const events = ref([
      {title:'2026中国设计星施工图大赛',icon:'🏆',status:'ongoing',statusText:'进行中',date:'2026.07.01 - 09.30',desc:'面向全国征集施工图深化设计作品，评选最具技术创新和落地价值的深化设计项目。',org:'design.中国 × 中国建筑学会'},
      {title:'亚洲室内设计论坛2026',icon:'🎤',status:'upcoming',statusText:'即将开始',date:'2026.09.15 - 09.17',desc:'汇聚亚洲顶级室内设计师，探讨设计趋势与技术革新。',org:'亚洲室内设计联合会'},
      {title:'中国建筑师学会年度展览',icon:'🏛️',status:'upcoming',statusText:'报名中',date:'2026.10.01 - 10.15',desc:'每年一届的建筑设计大展，新增施工图深化设计独立展区。',org:'中国建筑师学会'},
      {title:'设计思维工作坊·深圳站',icon:'💡',status:'ongoing',statusText:'进行中',date:'2026.07.15 - 08.15',desc:'为期一个月的高密度设计思维培训，涵盖方案设计到施工图落地的全流程。',org:'design.中国'},
      {title:'首届商业空间设计创新峰会',icon:'🏪',status:'ended',statusText:'已结束',date:'2026.05.20 - 05.22',desc:'聚焦商业空间设计创新，从体验设计到工程落地的完整解决方案。',org:'中国商业设计协会'},
      {title:'第三届绿色建筑与室内设计展',icon:'🌿',status:'ended',statusText:'已结束',date:'2026.04.10 - 04.12',desc:'绿色建筑标准下的室内设计实践，展示最新的可持续材料与低碳施工方案。',org:'绿色建筑促进会'},
    ]);

    /* ===== 个人作品 ===== */
    const myWorks = computed(()=>{
      if(!currentUser.value) return [];
      const ids = currentUser.value.works||[];
      return works.value.filter(w=>ids.includes(w.id));
    });

    /* ===== 生命周期 ===== */
    onMounted(() => {
      const hash = window.location.hash.replace('#/','');
      if(routes.includes(hash)) route.value = hash;
    });

    /* ---- 导出 ---- */
    return {
      route,routes,navigate,isActive,menuOpen,toggleMenu,closeMenu,toastMsg,showToast,
      homeSearch,doHomeSearch,
      // 会员
      currentUser,isLoggedIn,authOpen,authTab,authPhone,authCode,authWechat,
      authSending,authCountdown,openAuth,closeAuth,sendSMS,doAuth,doLogout,
      userMenuOpen,toggleUserMenu,closeUserMenu,
      editProfile,editForm,avatarOptions,openEditProfile,saveProfile,
      promoOpen,promoPlans,selectedPromo,openPromo,closePromo,buyPromo,confirmPromo,
      viewingUser,viewUserProfile,
      // 作品
      worksFilter,worksSearch,worksSort,works,filteredWorks,workCats,
      likeWork,openWork,closeWork,selectedWork,
      showUpload,uploadData,submitUpload,promoteWork,
      // 我的作品
      myWorks,
      // 服务
      services,serviceView,selectedService,orderForm,selService,submitOrder,
      // 需求
      demandView,demandForm,demandTypes,selDemandType,submitDemand,matchResults,
      // 动态
      newsTab,articles,events,
    };
  }
});

app.mount('#app');

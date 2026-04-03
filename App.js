import React, { useState, useReducer, useCallback, useRef, useEffect } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity, ScrollView,
  Modal, TextInput, StyleSheet, FlatList, Alert, Share,
  StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// ─── AdMob IDs ───────────────────────────────────────────────────────────────
const ADMOB_APP_ID = 'ca-app-pub-9247710286493186~4041726559';
const BANNER_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : 'ca-app-pub-9247710286493186/8112104556';

const C = {
  navy:'#1a2e52',totalRed:'#c0433a',totalRedLt:'#f5bcb8',
  hammerBlue:'#d8e6f2',hammerBlueDk:'#0c3060',hammerBlueMd:'#5a84b0',
  quickBlue:'#e6f1fb',quickBlueBdr:'#b5d4f4',infoBlue:'#185fa5',
  green:'#1a5c2a',greenDk:'#2d5a12',greenLt:'#eaf3de',greenBdr:'#c0dd97',greenText:'#3b6d11',
  amber:'#8a4a00',amberLt:'#f5c070',
  barGreen:'#4caf50',barAmber:'#e8a020',barRed:'#c0433a',
  white:'#ffffff',bg:'#f5f5f5',surface:'#ffffff',border:'#e0e0e0',borderMid:'#cccccc',
  textPrimary:'#1a1a1a',textSecond:'#666666',textTertiary:'#999999',danger:'#a32d2d',
};

const CURRENCY_OPTIONS = [
  {symbol:'£',label:'£  GBP'},{symbol:'€',label:'€  EUR'},{symbol:'$',label:'$  USD'},
  {symbol:'¥',label:'¥  JPY'},{symbol:'Fr',label:'Fr  CHF'},{symbol:'kr',label:'kr  SEK'},
];

const DEFAULT_LISTS = [
  { id:'1', name:'Belfast Auction 20AUG219', lots:[
    {ser:1,lot:'07',desc:'Dinner Table',vat:true,comm:true,maxWorth:100,purchased:true,hp:42},
    {ser:2,lot:'24',desc:'Taps',vat:false,comm:true,maxWorth:20,purchased:true,hp:8},
    {ser:3,lot:'67',desc:'Sofa',vat:true,comm:true,maxWorth:400,purchased:true,hp:270},
    {ser:4,lot:'127',desc:'Bath',vat:true,comm:true,maxWorth:300,purchased:true,hp:125},
    {ser:5,lot:'305',desc:'Desk',vat:true,comm:true,maxWorth:250,purchased:true,hp:95},
    {ser:6,lot:'324',desc:'Water Fountain',vat:true,comm:true,maxWorth:150,purchased:null,hp:null},
  ]},
  { id:'2', name:'Dublin Office Furniture', lots:[
    {ser:1,lot:'12',desc:'Reception Desk',vat:true,comm:true,maxWorth:200,purchased:null,hp:null},
    {ser:2,lot:'34',desc:'Office Chairs x6',vat:true,comm:true,maxWorth:120,purchased:null,hp:null},
    {ser:3,lot:'56',desc:'Filing Cabinet',vat:false,comm:true,maxWorth:50,purchased:null,hp:null},
  ]},
];

function calcTC(hp,commOn,commPct,vatOn,vatPct,miscOn,miscVal){
  const cv=commOn?commPct/100:0,vv=vatOn?vatPct/100:0;
  const c1=hp*cv,v3=hp*vv+c1*vv;
  return hp+c1+v3+(miscOn?miscVal:0);
}
function calcMB(mw,commOn,vatOn,miscOn,miscVal){
  const f=vatOn?(commOn?0.69444:0.8064):(commOn?0.8064:1);
  return Math.max(0,(mw-(miscOn?miscVal:0))*f);
}
function calcTCLot(hp,lot,cPct,vPct){
  const cv=lot.comm?cPct/100:0,vv=lot.vat?vPct/100:0;
  const c1=hp*cv,v3=hp*vv+c1*vv;
  return hp+c1+v3;
}
function buildCSV(list,cur,cPct,vPct){
  const rows=['Ser#,Lot#,Description,VAT,Commission,Max Worth,Max Bid,Purchased,Hammer Price,Total Cost'];
  list.lots.forEach(l=>{
    const mb=calcMB(l.maxWorth,l.comm,l.vat,false,0);
    const tc=l.purchased&&l.hp!=null?calcTCLot(l.hp,l,cPct,vPct).toFixed(2):'';
    rows.push([l.ser,l.lot,`"${l.desc}"`,l.vat?'Y':'N',l.comm?'Y':'N',
      l.maxWorth,mb.toFixed(2),l.purchased===true?'Yes':l.purchased===false?'No':'',
      l.hp!=null?l.hp:'',tc].join(','));
  });
  return rows.join('\n');
}

// ── Numpad Modal ─────────────────────────────────────────────────────────────
function NumpadModal({visible,title,initialValue,onConfirm,onCancel}){
  const [val,setVal]=useState('0');
  React.useEffect(()=>{if(visible)setVal(String(Math.round(initialValue||0)));},[visible,initialValue]);
  const press=k=>{
    if(k==='clr')setVal(v=>v.length>1?v.slice(0,-1):'0');
    else if(k==='ok')onConfirm(parseFloat(val)||0);
    else setVal(v=>v==='0'?k:v+k);
  };
  return(
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={s.modalBox}>
          <Text style={s.modalTitle}>{title}</Text>
          <Text style={s.modalValue}>{val}</Text>
          <View style={s.numpadGrid}>
            {['1','2','3','4','5','6','7','8','9','clr','0','ok'].map(k=>(
              <TouchableOpacity key={k} style={[s.npBtn,k==='ok'&&s.npOk,k==='clr'&&s.npClr]} onPress={()=>press(k)}>
                <Text style={[s.npTxt,k==='ok'&&s.npOkTxt,k==='clr'&&s.npClrTxt]}>
                  {k==='ok'?'✓':k==='clr'?'✕':k}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Currency Picker Modal ─────────────────────────────────────────────────────
function CurrencyModal({visible,current,onConfirm,onCancel}){
  const [sel,setSel]=useState(current);
  const [custom,setCustom]=useState('');
  React.useEffect(()=>{if(visible){setSel(current);setCustom('');}},[visible,current]);
  return(
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={[s.modalBox,{width:300}]}>
          <Text style={s.modalTitle}>Select currency symbol</Text>
          <View style={s.currGrid}>
            {CURRENCY_OPTIONS.map(o=>(
              <TouchableOpacity key={o.symbol} style={[s.currOpt,sel===o.symbol&&!custom&&s.currOptSel]}
                onPress={()=>{setSel(o.symbol);setCustom('');}}>
                <Text style={[s.currOptTxt,sel===o.symbol&&!custom&&s.currOptTxtSel]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.modalTitle,{marginTop:14,marginBottom:6}]}>Or enter custom symbol:</Text>
          <TextInput style={s.currCustom} value={custom}
            onChangeText={v=>{setCustom(v);if(v)setSel(v);}}
            placeholder="e.g. ₹" maxLength={3} autoCapitalize="none"/>
          {sel?<Text style={{fontSize:12,color:C.textTertiary,marginTop:8}}>
            Selected: <Text style={{fontWeight:'600',color:C.textPrimary}}>{sel}</Text></Text>:null}
          <View style={s.modalActions}>
            <TouchableOpacity style={[s.modalActionBtn,s.modalCancel]} onPress={onCancel}>
              <Text style={s.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modalActionBtn,s.modalOk]} onPress={()=>sel&&onConfirm(sel)}>
              <Text style={s.modalOkTxt}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Create New List Modal ─────────────────────────────────────────────────────
function CreateNewModal({visible,onSave,onCancel}){
  const [listName,setListName]=useState('');
  const [lots,setLots]=useState([{id:1,lot:'',desc:'',maxWorth:'',vat:true,comm:true}]);
  const nextId=useRef(2);
  React.useEffect(()=>{
    if(visible){setListName('');setLots([{id:1,lot:'',desc:'',maxWorth:'',vat:true,comm:true}]);nextId.current=2;}
  },[visible]);
  const addLot=()=>setLots(p=>[...p,{id:nextId.current++,lot:'',desc:'',maxWorth:'',vat:true,comm:true}]);
  const upd=(id,f,v)=>setLots(p=>p.map(l=>l.id===id?{...l,[f]:v}:l));
  const rem=id=>setLots(p=>p.filter(l=>l.id!==id));
  const save=()=>{
    if(!listName.trim()){Alert.alert('Name required','Please enter a list name.');return;}
    onSave({id:String(Date.now()),name:listName.trim(),
      lots:lots.map((l,i)=>({ser:i+1,lot:l.lot||String(i+1),desc:l.desc||`Lot ${i+1}`,
        vat:l.vat,comm:l.comm,maxWorth:parseFloat(l.maxWorth)||0,purchased:null,hp:null}))});
  };
  return(
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{flex:1,backgroundColor:C.surface}}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
          <View style={s.createHeader}>
            <TouchableOpacity onPress={onCancel}><Text style={s.createCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.createTitle}>New List</Text>
            <TouchableOpacity onPress={save}><Text style={s.createSave}>Create</Text></TouchableOpacity>
          </View>
          <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled">
            <View style={s.createSection}>
              <Text style={s.createSectionLbl}>LIST NAME</Text>
              <TextInput style={s.createInput} value={listName} onChangeText={setListName}
                placeholder="e.g. Belfast Auction July" placeholderTextColor={C.textTertiary} autoFocus/>
            </View>
            <View style={s.createSection}>
              <Text style={s.createSectionLbl}>LOTS</Text>
              {lots.map((lot,i)=>(
                <View key={lot.id} style={s.lotEntryCard}>
                  <View style={s.lotEntryRow}>
                    <Text style={s.lotEntryLbl}>#{i+1}</Text>
                    <TextInput style={[s.lotEntryInput,{width:60}]} value={lot.lot}
                      onChangeText={v=>upd(lot.id,'lot',v)} placeholder="Lot#" placeholderTextColor={C.textTertiary}/>
                    <TextInput style={[s.lotEntryInput,{flex:1}]} value={lot.desc}
                      onChangeText={v=>upd(lot.id,'desc',v)} placeholder="Description" placeholderTextColor={C.textTertiary}/>
                    {lots.length>1&&<TouchableOpacity onPress={()=>rem(lot.id)} style={{padding:4}}>
                      <Text style={{color:C.danger,fontSize:16}}>✕</Text></TouchableOpacity>}
                  </View>
                  <View style={s.lotEntryRow}>
                    <Text style={s.lotEntryLbl}>Worth</Text>
                    <TextInput style={[s.lotEntryInput,{width:80}]} value={lot.maxWorth}
                      onChangeText={v=>upd(lot.id,'maxWorth',v)} placeholder="0"
                      keyboardType="numeric" placeholderTextColor={C.textTertiary}/>
                    <TouchableOpacity style={[s.togglePill,lot.vat?s.togglePillOn:s.togglePillOff]}
                      onPress={()=>upd(lot.id,'vat',!lot.vat)}>
                      <Text style={[s.togglePillTxt,lot.vat?s.togglePillTxtOn:s.togglePillTxtOff]}>VAT {lot.vat?'Y':'N'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.togglePill,lot.comm?s.togglePillOn:s.togglePillOff]}
                      onPress={()=>upd(lot.id,'comm',!lot.comm)}>
                      <Text style={[s.togglePillTxt,lot.comm?s.togglePillTxtOn:s.togglePillTxtOff]}>Comm {lot.comm?'Y':'N'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={s.addLotBtn} onPress={addLot}>
                <Text style={s.addLotTxt}>+ Add lot</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Budget Bar ────────────────────────────────────────────────────────────────
function BudgetBar({hp,maxWorth,currency,onPressMax}){
  const pct=maxWorth>0?Math.min(hp/maxWorth,1):0;
  const color=hp===0?C.barGreen:pct<0.8?C.barGreen:pct<1?C.barAmber:C.barRed;
  const status=hp===0?'Ready to bid':pct<0.8?'Under budget':pct<1?'Approaching limit':'Over max worth!';
  const statusColor=pct<0.8?C.greenDk:pct<1?'#b06010':C.danger;
  return(
    <View style={s.budgetWrap}>
      <View style={s.budgetLabels}>
        <Text style={s.budgetLeft}>HP <Text style={s.budgetBold}>{currency}{hp}</Text> of max{' '}
          <Text style={[s.budgetBold,{textDecorationLine:'underline'}]} onPress={onPressMax}>{currency}{maxWorth}</Text>
        </Text>
        <Text style={[s.budgetStatus,{color:statusColor}]}>{status}</Text>
      </View>
      <TouchableOpacity onPress={onPressMax} style={s.barTrack} activeOpacity={0.8}>
        <View style={[s.barFill,{width:`${Math.round(pct*100)}%`,backgroundColor:color}]}/>
      </TouchableOpacity>
      <Text style={s.barHint} onPress={onPressMax}>Tap to set max worth ✎</Text>
    </View>
  );
}

function Toggle({on,onToggle}){
  return(
    <TouchableOpacity style={[s.togTrack,on?s.togOn:s.togOff]} onPress={onToggle} activeOpacity={0.8}>
      <View style={[s.togThumb,on?s.togThumbOn:s.togThumbOff]}/>
    </TouchableOpacity>
  );
}

// ── Calculator Screen ─────────────────────────────────────────────────────────
function CalculatorScreen({state,dispatch,onMenuOpen}){
  const {hp,maxWorth,commOn,commPct,vatOn,vatPct,miscOn,miscVal,sessionTotal,currency,currentLotIdx,activeList}=state;
  const [modal,setModal]=useState(null);
  const lot=activeList?.lots[currentLotIdx];
  const tc=calcTC(hp,commOn,commPct,vatOn,vatPct,miscOn,miscVal);
  const mb=calcMB(maxWorth,commOn,vatOn,miscOn,miscVal);
  const meta={
    SET_HP:{title:'Set Hammer Price',val:hp},SET_WORTH:{title:'Set My Max Worth',val:maxWorth},
    SET_COMM_PCT:{title:'Set Commission %',val:commPct},SET_VAT_PCT:{title:'Set VAT %',val:vatPct},
    SET_MISC_VAL:{title:'Set Misc. amount',val:miscVal},
  };
  return(
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy}/>
      <View style={s.navbar}>
        <TouchableOpacity onPress={onMenuOpen} style={s.burgerBtn} hitSlop={{top:10,bottom:10,left:10,right:10}}>
          {[0,1,2].map(i=><View key={i} style={s.burgerLine}/>)}
        </TouchableOpacity>
        <Text style={s.navTitle}>Auction Calculator</Text>
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.lotBlock} onPress={()=>dispatch({type:'SET_SCREEN',screen:'listOpen'})} activeOpacity={0.75}>
          <View style={s.lotStrip}>
            <View style={s.pill}><Text style={s.pillTxt}>List <Text style={s.pillBold}>#{currentLotIdx+1}</Text></Text></View>
            <View style={s.pill}><Text style={s.pillTxt}>Lot <Text style={s.pillBold}>#{lot?.lot??'—'}</Text></Text></View>
            <Text style={s.lotDesc} numberOfLines={1}>{lot?.desc??(activeList?'All lots done':'No list loaded')}</Text>
          </View>
          <BudgetBar hp={hp} maxWorth={maxWorth} currency={currency} onPressMax={()=>setModal({t:'SET_WORTH'})}/>
        </TouchableOpacity>
        <View style={s.costPad}>
          <View style={s.totalBox}><Text style={s.totalLbl}>Total cost (inc. all fees)</Text><Text style={s.totalAmt}>{currency}{tc.toFixed(2)}</Text></View>
          <TouchableOpacity style={s.hammerBox} onPress={()=>setModal({t:'SET_HP'})} activeOpacity={0.85}>
            <View><Text style={s.hammerLbl}>Hammer Price — tap to edit</Text><Text style={s.hammerAmt}>{currency}{hp}</Text></View>
            <Text style={s.editHint}>✎</Text>
          </TouchableOpacity>
        </View>
        <View style={s.qaPad}>
          <Text style={s.secLbl}>Quick add to hammer price</Text>
          <View style={s.qaRow}>
            {[1,5,10,20].map(n=>(
              <TouchableOpacity key={n} style={s.qaChip} onPress={()=>dispatch({type:'ADD_HP',value:n})} activeOpacity={0.75}>
                <Text style={s.qaChipTxt}>+{currency}{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.secLbl}>Jump to % above current</Text>
          <View style={s.pctRow}>
            {[5,10,15,20].map(p=>(
              <TouchableOpacity key={p} style={s.pctChip} onPress={()=>dispatch({type:'PCT_HP',value:p})} activeOpacity={0.75}>
                <Text style={s.pctNum}>+{p}%</Text>
                <Text style={s.pctVal}>{currency}{Math.round(hp*(1+p/100))}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.feePad}>
          {[
            {label:'Commission',on:commOn,tog:'TOGGLE_COMM',dv:commOn?`${commPct}%`:'off',et:'SET_COMM_PCT',ev:commPct},
            {label:'VAT',on:vatOn,tog:'TOGGLE_VAT',dv:vatOn?`${vatPct}%`:'off',et:'SET_VAT_PCT',ev:vatPct},
            {label:'Misc.',on:miscOn,tog:'TOGGLE_MISC',dv:miscOn?`${currency}${miscVal}`:'off',et:'SET_MISC_VAL',ev:miscVal},
          ].map(f=>(
            <View key={f.label} style={s.feeRow}>
              <Toggle on={f.on} onToggle={()=>dispatch({type:f.tog})}/>
              <Text style={s.feeLabel}>{f.label}</Text>
              <TouchableOpacity onPress={()=>f.on&&setModal({t:f.et})}>
                <Text style={[s.feeVal,!f.on&&s.feeValOff]}>{f.dv}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={s.actRow}>
          <TouchableOpacity style={s.wonBtn} onPress={()=>dispatch({type:'WON'})} activeOpacity={0.85}><Text style={s.wonTxt}>✓  Won</Text></TouchableOpacity>
          <TouchableOpacity style={s.lostBtn} onPress={()=>dispatch({type:'LOST'})} activeOpacity={0.85}><Text style={s.lostTxt}>✕  Lost</Text></TouchableOpacity>
        </View>
        <View style={s.statsRow}>
          <View style={s.statBid}><Text style={s.statLblLight}>My max bid</Text><Text style={s.statValLight}>{currency}{mb.toFixed(0)}</Text></View>
          <TouchableOpacity style={s.statTotal} onPress={()=>dispatch({type:'SET_SCREEN',screen:'listOpen'})} activeOpacity={0.8}>
            <Text style={s.statLblDark}>Session total ›</Text><Text style={s.statValDark}>{currency}{sessionTotal.toFixed(0)}</Text>
          </TouchableOpacity>
        </View>
        <AdBanner />
      </ScrollView>
      {modal&&meta[modal.t]&&(
        <NumpadModal visible title={meta[modal.t].title} initialValue={meta[modal.t].val}
          onConfirm={v=>{dispatch({type:modal.t,value:v});setModal(null);}} onCancel={()=>setModal(null)}/>
      )}
    </SafeAreaView>
  );
}

// ── Complete Screen ───────────────────────────────────────────────────────────
function CompleteScreen({state,dispatch}){
  const {activeList,sessionTotal,currency}=state;
  const won=activeList?.lots.filter(l=>l.purchased===true).length??0;
  const total=activeList?.lots.length??0;
  return(
    <SafeAreaView style={s.safeArea}>
      <View style={s.navbar}><Text style={s.navTitle}>Auction Calculator</Text></View>
      <View style={{backgroundColor:C.navy,padding:20,alignItems:'center'}}>
        <Text style={{color:C.white,fontSize:16,fontWeight:'600'}}>{activeList?.name}</Text>
        <Text style={{color:'#aac4e0',fontSize:12,marginTop:4}}>All {total} lots processed</Text>
      </View>
      <View style={{flexDirection:'row',gap:10,padding:16}}>
        <View style={{flex:1,backgroundColor:C.greenDk,borderRadius:10,padding:14}}>
          <Text style={{color:'#a8d870',fontSize:10,marginBottom:4}}>Lots won</Text>
          <Text style={{color:C.white,fontSize:26,fontWeight:'600'}}>{won} / {total}</Text>
        </View>
        <View style={{flex:1,backgroundColor:C.bg,borderRadius:10,borderWidth:0.5,borderColor:C.border,padding:14}}>
          <Text style={{color:C.textTertiary,fontSize:10,marginBottom:4}}>Session total</Text>
          <Text style={{color:C.textPrimary,fontSize:26,fontWeight:'600'}}>{currency}{sessionTotal.toFixed(0)}</Text>
        </View>
      </View>
      <View style={{flexDirection:'row',gap:8,paddingHorizontal:16}}>
        <TouchableOpacity style={{flex:1,backgroundColor:C.quickBlue,borderRadius:9,borderWidth:0.5,borderColor:C.quickBlueBdr,padding:13,alignItems:'center'}}
          onPress={()=>dispatch({type:'SET_SCREEN',screen:'listOpen'})}>
          <Text style={{color:C.infoBlue,fontSize:14,fontWeight:'500'}}>View list</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{flex:1,backgroundColor:C.greenLt,borderRadius:9,borderWidth:0.5,borderColor:C.greenBdr,padding:13,alignItems:'center'}}
          onPress={()=>dispatch({type:'SET_SCREEN',screen:'listSelect'})}>
          <Text style={{color:C.greenText,fontSize:14,fontWeight:'500'}}>New list</Text>
        </TouchableOpacity>
      </View>
      <AdBanner />
    </SafeAreaView>
  );
}

// ── List Preview Modal ───────────────────────────────────────────────────────
function ListPreviewModal({list,currency,commPct,vatPct,onLoad,onCancel}){
  if(!list) return null;
  const won=list.lots.filter(l=>l.purchased===true).length;
  const tot=list.lots.reduce((s,l)=>s+(l.purchased&&l.hp!=null?calcTCLot(l.hp,l,commPct,vatPct):0),0);
  const pending=list.lots.filter(l=>l.purchased===null).length;
  return(
    <Modal visible={!!list} transparent animationType='slide'>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.45)',justifyContent:'flex-end'}}>
        <View style={{backgroundColor:C.white,borderTopLeftRadius:16,borderTopRightRadius:16,maxHeight:'80%'}}>
          <View style={{backgroundColor:C.navy,padding:16,borderTopLeftRadius:16,borderTopRightRadius:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <Text style={{color:C.white,fontSize:15,fontWeight:'600',flex:1}} numberOfLines={1}>{list.name}</Text>
            <TouchableOpacity onPress={onCancel} style={{padding:4}}><Text style={{color:'#aac4e0',fontSize:16}}>✕</Text></TouchableOpacity>
          </View>
          <View style={{flexDirection:'row',padding:12,gap:8,borderBottomWidth:0.5,borderBottomColor:C.border}}>
            {[{label:'Lots',val:list.lots.length,color:C.textPrimary},{label:'Pending',val:pending,color:C.infoBlue},{label:'Won',val:won,color:C.greenText},{label:'Spent',val:currency+tot.toFixed(0),color:C.textPrimary}].map((item,i)=>(
              <View key={i} style={{flex:1,backgroundColor:'#f8f8f8',borderRadius:8,padding:8,alignItems:'center'}}>
                <Text style={{fontSize:9,color:C.textTertiary,marginBottom:2}}>{item.label}</Text>
                <Text style={{fontSize:15,fontWeight:'600',color:item.color}}>{item.val}</Text>
              </View>
            ))}
          </View>
          <ScrollView style={{maxHeight:320}}>
            {list.lots.map((lot,i)=>{
              const statusColor=lot.purchased===true?C.greenText:lot.purchased===false?C.textTertiary:C.infoBlue;
              const statusLabel=lot.purchased===true?'Won':lot.purchased===false?'Lost':'Pending';
              return(
                <View key={i} style={{flexDirection:'row',alignItems:'center',paddingVertical:10,paddingHorizontal:14,borderBottomWidth:0.5,borderBottomColor:C.border,backgroundColor:i%2===1?'#f8f8f8':C.white}}>
                  <Text style={{width:36,fontSize:11,color:C.textTertiary}}>#{lot.lot}</Text>
                  <Text style={{flex:1,fontSize:13,color:C.textPrimary}} numberOfLines={1}>{lot.desc}</Text>
                  <Text style={{fontSize:11,color:C.textSecond,marginRight:8}}>{currency}{lot.maxWorth}</Text>
                  <Text style={{fontSize:11,color:statusColor,fontWeight:'600',width:48,textAlign:'right'}}>{statusLabel}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={{flexDirection:'row',gap:8,padding:14}}>
            <TouchableOpacity style={{flex:1,backgroundColor:'#f0f0f0',borderRadius:9,padding:13,alignItems:'center'}} onPress={onCancel}>
              <Text style={{color:C.textSecond,fontSize:14,fontWeight:'500'}}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flex:2,backgroundColor:C.navy,borderRadius:9,padding:13,alignItems:'center'}} onPress={onLoad}>
              <Text style={{color:C.white,fontSize:14,fontWeight:'600'}}>▶  Load this list</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── List Select ───────────────────────────────────────────────────────────────
function ListSelectScreen({lists,currency,commPct,vatPct,onSelect,onBack}){
  const [preview,setPreview]=useState(null);
  const ri=({item})=>{
    const won=item.lots.filter(l=>l.purchased===true).length;
    const tot=item.lots.reduce((s,l)=>s+(l.purchased&&l.hp!=null?calcTCLot(l.hp,l,commPct,vatPct):0),0);
    return(
      <TouchableOpacity style={s.listItem} onPress={()=>setPreview(item)} activeOpacity={0.75}>
        <View style={s.listIconBox}><Text style={{fontSize:24}}>📋</Text></View>
        <View style={{flex:1}}>
          <Text style={s.listName}>{item.name}</Text>
          <Text style={s.listMeta}>{item.lots.length} lots · {won} purchased · {currency}{tot.toFixed(0)} total</Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </TouchableOpacity>
    );
  };
  return(
    <SafeAreaView style={s.safeArea}>
      <View style={s.navbar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backTxt}>‹ Back</Text></TouchableOpacity>
        <Text style={s.navTitle}>Open List</Text>
      </View>
      <FlatList data={lists} keyExtractor={i=>i.id} renderItem={ri}/>
      <AdBanner />
      <ListPreviewModal list={preview} currency={currency} commPct={commPct} vatPct={vatPct}
        onLoad={()=>{const item=preview;setPreview(null);onSelect(item);}}
        onCancel={()=>setPreview(null)}/>
    </SafeAreaView>
  );
}

// ── Open List ─────────────────────────────────────────────────────────────────
function OpenListScreen({list,currentLotIdx,currency,commPct,vatPct,onBack,onLoad,onExport,onUpdateWorth}){
  const [editWorth,setEditWorth]=useState(null);
  const won=list.lots.filter(l=>l.purchased===true).length;
  const tot=list.lots.reduce((s,l)=>s+(l.purchased&&l.hp!=null?calcTCLot(l.hp,l,commPct,vatPct):0),0);
  const ri=({item,index})=>{
    const mb=calcMB(item.maxWorth,item.comm,item.vat,false,0);
    const tc=item.purchased&&item.hp!=null?calcTCLot(item.hp,item,commPct,vatPct):null;
    const isCur=index===currentLotIdx&&item.purchased===null;
    return(
      <View style={[s.tableRow,index%2===1&&s.tableRowAlt,isCur&&s.tableRowCurrent]}>
        {isCur&&<View style={s.currentIndicator}/>}
        <Text style={[s.td,{width:24}]}>{item.ser}</Text>
        <Text style={[s.td,{width:36}]}>{item.lot}</Text>
        <Text style={[s.td,{width:110}]} numberOfLines={1}>{item.desc}</Text>
        <Text style={[s.td,{width:28}]}>{item.vat?'Y':'N'}</Text>
        <Text style={[s.td,{width:32}]}>{item.comm?'Y':'N'}</Text>
        <TouchableOpacity onPress={()=>item.purchased===null&&setEditWorth({idx:index,val:item.maxWorth})} style={[s.td,{width:60}]}>
          <Text style={{fontSize:10,color:item.purchased===null?C.infoBlue:C.textPrimary,textDecorationLine:item.purchased===null?'underline':'none'}}>{currency}{item.maxWorth}</Text>
        </TouchableOpacity>
        <Text style={[s.td,{width:54}]}>{currency}{mb.toFixed(0)}</Text>
        <Text style={[s.td,{width:36},item.purchased===true&&s.tdYes,item.purchased===false&&s.tdNo]}>
          {item.purchased===true?'Yes':item.purchased===false?'No':'—'}
        </Text>
        <Text style={[s.td,{width:48}]}>{item.hp!=null?`${currency}${item.hp}`:'—'}</Text>
        <Text style={[s.td,{width:54}]}>{tc!=null?`${currency}${tc.toFixed(0)}`:'—'}</Text>
      </View>
    );
  };
  return(
    <SafeAreaView style={s.safeArea}>
      <View style={s.navbar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backTxt}>‹ Back</Text></TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>{list.name}</Text>
      </View>
      <View style={s.listTitleBar}>
        <Text style={s.listTitleTxt}>{list.name}</Text>
        <Text style={s.listMetaTxt}>{list.lots.length} lots · {won} purchased · {currency}{tot.toFixed(0)} total</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[s.tableRow,s.tableHeader]}>
            {['#','Lot','Description','VAT','Comm','Max Worth','Max Bid','Purch.','HP','Total'].map((h,i)=>(
              <Text key={i} style={[s.th,{width:[24,36,110,28,32,60,54,36,48,54][i]}]}>{h}</Text>
            ))}
          </View>
          <FlatList data={list.lots} keyExtractor={(_,i)=>String(i)} renderItem={ri} scrollEnabled={false}/>
        </View>
      </ScrollView>
      <View style={s.tblActions}>
        <TouchableOpacity style={[s.tblBtn,s.tblBtnNavy]} onPress={onLoad}><Text style={s.tblBtnNavyTxt}>▶ Load list</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tblBtn,s.tblBtnBlue]} onPress={onBack}><Text style={s.tblBtnBlueTxt}>‹ Calculator</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tblBtn,s.tblBtnGreen]} onPress={onExport}><Text style={s.tblBtnGreenTxt}>↓ Export CSV</Text></TouchableOpacity>
      </View>
      <AdBanner />
      {editWorth&&<NumpadModal visible title={'Set Max Worth for lot '+list.lots[editWorth.idx]?.lot} initialValue={editWorth.val}
        onConfirm={v=>{onUpdateWorth(editWorth.idx,v);setEditWorth(null);}} onCancel={()=>setEditWorth(null)}/>}
    </SafeAreaView>
  );
}

// ── About Screen ──────────────────────────────────────────────────────────────
function AboutScreen({onBack}){
  return(
    <SafeAreaView style={s.safeArea}>
      <View style={s.navbar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backTxt}>‹ Back</Text></TouchableOpacity>
        <Text style={s.navTitle}>About</Text>
      </View>
      <ScrollView>
        <View style={{alignItems:'center',padding:30,borderBottomWidth:0.5,borderBottomColor:C.border}}>
          <View style={{width:72,height:72,borderRadius:16,backgroundColor:C.navy,alignItems:'center',justifyContent:'center',marginBottom:14}}>
            <Text style={{fontSize:32}}>🔨</Text>
          </View>
          <Text style={{fontSize:20,fontWeight:'600',color:C.textPrimary,marginBottom:4}}>Auction Calculator</Text>
          <Text style={{fontSize:13,color:C.textTertiary}}>Version 1.0.0</Text>
        </View>
        <View style={{padding:20}}>
          <Text style={{fontSize:13,color:C.textSecond,lineHeight:20,marginBottom:20,textAlign:'center'}}>
            A tool for bidders to calculate total costs including commission and VAT, track lots, and manage auction lists.
          </Text>
          <View style={{borderWidth:0.5,borderColor:C.border,borderRadius:10,overflow:'hidden'}}>
            <View style={{padding:14,borderBottomWidth:0.5,borderBottomColor:C.border,flexDirection:'row',justifyContent:'space-between'}}>
              <Text style={{fontSize:13,color:C.textSecond}}>Developer</Text>
              <Text style={{fontSize:13,color:C.textPrimary,fontWeight:'500'}}>Laurence</Text>
            </View>
            <View style={{padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
              <Text style={{fontSize:13,color:C.textSecond}}>Feedback & support</Text>
              <Text style={{fontSize:13,color:C.infoBlue,fontWeight:'500'}}>riversidedevs@gmail.com</Text>
            </View>
          </View>
          <Text style={{fontSize:11,color:C.textTertiary,textAlign:'center',marginTop:20,lineHeight:16}}>
            Your data is stored locally on your device only. No account required.
          </Text>
        </View>
      </ScrollView>
      <AdBanner />
    </SafeAreaView>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsScreen({state,dispatch,onBack}){
  const [numModal,setNumModal]=useState(null);
  const [currModal,setCurrModal]=useState(false);
  const {currency,defCommPct,defVatPct}=state;
  return(
    <SafeAreaView style={s.safeArea}>
      <View style={s.navbar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backTxt}>‹ Back</Text></TouchableOpacity>
        <Text style={s.navTitle}>Settings</Text>
      </View>
      <ScrollView>
        <View style={s.settHead}><Text style={{fontSize:22}}>⚙️</Text><Text style={s.settTitle}>Settings</Text></View>
        <Text style={s.settSectionLbl}>CURRENCY</Text>
        <TouchableOpacity style={s.settRow} onPress={()=>setCurrModal(true)} activeOpacity={0.7}>
          <Text style={s.settLabel}>Currency symbol</Text>
          <Text style={s.settVal}>{currency}</Text>
        </TouchableOpacity>
        <Text style={s.settSectionLbl}>DEFAULT FEE RATES</Text>
        <TouchableOpacity style={s.settRow} onPress={()=>setNumModal({type:'SET_DEF_COMM',val:defCommPct,title:'Default Commission %'})} activeOpacity={0.7}>
          <Text style={s.settLabel}>Commission</Text><Text style={s.settVal}>{defCommPct}%</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.settRow} onPress={()=>setNumModal({type:'SET_DEF_VAT',val:defVatPct,title:'Default VAT %'})} activeOpacity={0.7}>
          <Text style={s.settLabel}>VAT</Text><Text style={s.settVal}>{defVatPct}%</Text>
        </TouchableOpacity>
        <Text style={s.settHint}>These are global defaults. Per-lot VAT and commission settings override these when a list is open.</Text>
      </ScrollView>
      <AdBanner />
      {numModal&&<NumpadModal visible title={numModal.title} initialValue={numModal.val}
        onConfirm={v=>{dispatch({type:numModal.type,value:v});setNumModal(null);}} onCancel={()=>setNumModal(null)}/>}
      <CurrencyModal visible={currModal} current={currency}
        onConfirm={sym=>{dispatch({type:'SET_CURRENCY',value:sym});setCurrModal(false);}}
        onCancel={()=>setCurrModal(false)}/>
    </SafeAreaView>
  );
}

// ── Burger Menu ───────────────────────────────────────────────────────────────
function BurgerMenu({visible,onClose,onAction}){
  return(
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={s.menuBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.menuPanel}>
          <View style={s.menuHeader}>
            <View style={{gap:5}}>{[0,1,2].map(i=><View key={i} style={s.burgerLine}/>)}</View>
            <Text style={{color:C.white,fontSize:14,fontWeight:'500',marginLeft:10}}>Menu</Text>
          </View>
          {[{l:'Clear All',a:'clear'},{l:'Open List',a:'openList'},{l:'Create New',a:'createNew'},{l:'Export List',a:'export'},{l:'Settings',a:'settings'},{l:'About',a:'about'}].map(item=>(
            <TouchableOpacity key={item.a} style={s.menuItem} onPress={()=>{onClose();onAction(item.a);}} activeOpacity={0.75}>
              <Text style={s.menuItemTxt}>{item.l}</Text>
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state,action){
  switch(action.type){
    case 'SET_HP':return{...state,hp:action.value};
    case 'ADD_HP':return{...state,hp:Math.max(0,state.hp+action.value)};
    case 'PCT_HP':return{...state,hp:Math.round(state.hp*(1+action.value/100))};
    case 'SET_WORTH':return{...state,maxWorth:action.value};
    case 'TOGGLE_COMM':return{...state,commOn:!state.commOn};
    case 'TOGGLE_VAT':return{...state,vatOn:!state.vatOn};
    case 'TOGGLE_MISC':return{...state,miscOn:!state.miscOn};
    case 'SET_COMM_PCT':return{...state,commPct:action.value};
    case 'SET_VAT_PCT':return{...state,vatPct:action.value};
    case 'SET_MISC_VAL':return{...state,miscVal:action.value};
    case 'SET_CURRENCY':return{...state,currency:action.value};
    case 'SET_DEF_COMM':return{...state,defCommPct:action.value,commPct:action.value};
    case 'SET_DEF_VAT':return{...state,defVatPct:action.value,vatPct:action.value};
    case 'CLEAR_HP':return{...state,hp:0};
    case 'SET_SCREEN':return{...state,screen:action.screen};
    case 'ADD_LIST':return{...state,lists:[...state.lists,action.list]};
    case 'UPDATE_LOT_WORTH':{
      const lists=state.lists.map((l,li)=>li!==state.activeListIdx?l:{...l,lots:l.lots.map((lot,i)=>i===action.lotIdx?{...lot,maxWorth:action.value}:lot)});
      return{...state,lists,activeList:lists[state.activeListIdx],maxWorth:state.currentLotIdx===action.lotIdx?action.value:state.maxWorth};
    }
    case 'LOAD_LIST':{
      const list=state.lists[action.index];
      const fi=list.lots.findIndex(l=>l.purchased===null);
      const idx=fi>=0?fi:0;
      const lot=list.lots[idx];
      return{...state,activeListIdx:action.index,activeList:list,currentLotIdx:idx,
        hp:0,maxWorth:lot?.maxWorth??0,commOn:lot?.comm??true,vatOn:lot?.vat??true,screen:'calc'};
    }
    case 'WON':{
      const lists=state.lists.map((l,li)=>li!==state.activeListIdx?l:
        {...l,lots:l.lots.map((lot,i)=>i===state.currentLotIdx?{...lot,purchased:true,hp:state.hp}:lot)});
      const tc=calcTC(state.hp,state.commOn,state.commPct,state.vatOn,state.vatPct,state.miscOn,state.miscVal);
      const ni=state.currentLotIdx+1,nl=lists[state.activeListIdx]?.lots[ni];
      if(!nl)return{...state,lists,activeList:lists[state.activeListIdx],sessionTotal:state.sessionTotal+tc,screen:'complete'};
      return{...state,lists,activeList:lists[state.activeListIdx],sessionTotal:state.sessionTotal+tc,
        hp:0,maxWorth:nl.maxWorth,commOn:nl.comm,vatOn:nl.vat,currentLotIdx:ni};
    }
    case 'LOST':{
      const lists=state.lists.map((l,li)=>li!==state.activeListIdx?l:
        {...l,lots:l.lots.map((lot,i)=>i===state.currentLotIdx?{...lot,purchased:false,hp:0}:lot)});
      const ni=state.currentLotIdx+1,nl=lists[state.activeListIdx]?.lots[ni];
      if(!nl)return{...state,lists,activeList:lists[state.activeListIdx],screen:'complete'};
      return{...state,lists,activeList:lists[state.activeListIdx],hp:0,maxWorth:nl.maxWorth,commOn:nl.comm,vatOn:nl.vat,currentLotIdx:ni};
    }
    default:return state;
  }
}

const INIT={
  screen:'calc',hp:0,maxWorth:100,commOn:true,commPct:20,vatOn:true,vatPct:20,miscOn:false,miscVal:0,
  sessionTotal:0,currency:'£',defCommPct:20,defVatPct:20,
  lists:DEFAULT_LISTS,activeListIdx:0,activeList:DEFAULT_LISTS[0],currentLotIdx:0,
};

// ─── Ad Banner Component ──────────────────────────────────────────────────────
function AdBanner() {
  return (
    <View style={s.adBar}>
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={err => console.log('Ad failed:', err)}
      />
    </View>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [state,dispatch]=useReducer(reducer,INIT);

  // Initialise AdMob once on app launch
  useEffect(() => {
    mobileAds().initialize().then(() => console.log('AdMob initialised'));
  }, []);
  const [menuOpen,setMenuOpen]=useState(false);
  const [createOpen,setCreateOpen]=useState(false);

  const handleExport=useCallback(async()=>{
    const list=state.activeList||state.lists[state.activeListIdx];
    if(!list){Alert.alert('No list','Open a list first.');return;}
    const csv=buildCSV(list,state.currency,state.commPct,state.vatPct);
    try{
      await Share.share({title:list.name,message:csv});
    }catch(e){
      Alert.alert('CSV Export',`${list.name}.csv\n\nNote: install expo-file-system + expo-sharing for file-based export.`);
    }
  },[state]);

  const handleMenu=useCallback(a=>{
    if(a==='clear')dispatch({type:'CLEAR_HP'});
    else if(a==='openList')dispatch({type:'SET_SCREEN',screen:'listSelect'});
    else if(a==='createNew')setCreateOpen(true);
    else if(a==='export')handleExport();
    else if(a==='settings')dispatch({type:'SET_SCREEN',screen:'settings'});
    else if(a==='about')dispatch({type:'SET_SCREEN',screen:'about'});
  },[handleExport]);

  const {screen,lists,activeList,activeListIdx,currentLotIdx,currency,commPct,vatPct}=state;
  return(
    <View style={{flex:1}}>
      <BurgerMenu visible={menuOpen} onClose={()=>setMenuOpen(false)} onAction={handleMenu}/>
      <CreateNewModal visible={createOpen}
        onSave={newList=>{
          dispatch({type:'ADD_LIST',list:newList});
          setCreateOpen(false);
          dispatch({type:'LOAD_LIST',index:lists.length});
        }}
        onCancel={()=>setCreateOpen(false)}/>
      {screen==='calc'&&<CalculatorScreen state={state} dispatch={dispatch} onMenuOpen={()=>setMenuOpen(true)}/>}
      {screen==='complete'&&<CompleteScreen state={state} dispatch={dispatch}/>}
      {screen==='listSelect'&&<ListSelectScreen lists={lists} currency={currency} commPct={commPct} vatPct={vatPct}
        onSelect={item=>{const idx=lists.findIndex(l=>l.id===item.id);dispatch({type:'SET_SCREEN',screen:'listOpen'});dispatch({type:'LOAD_LIST',index:idx});}}
        onBack={()=>dispatch({type:'SET_SCREEN',screen:'calc'})}/>}
      {screen==='listOpen'&&<OpenListScreen list={activeList||lists[activeListIdx]} currentLotIdx={currentLotIdx}
        currency={currency} commPct={commPct} vatPct={vatPct}
        onBack={()=>dispatch({type:'SET_SCREEN',screen:'calc'})}
        onLoad={()=>dispatch({type:'LOAD_LIST',index:activeListIdx})}
        onExport={handleExport}
        onUpdateWorth={(lotIdx,val)=>dispatch({type:'UPDATE_LOT_WORTH',lotIdx,value:val})}/>}
      {screen==='settings'&&<SettingsScreen state={state} dispatch={dispatch} onBack={()=>dispatch({type:'SET_SCREEN',screen:'calc'})}/>}
      {screen==='about'&&<AboutScreen onBack={()=>dispatch({type:'SET_SCREEN',screen:'calc'})}/>}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s=StyleSheet.create({
  safeArea:{flex:1,backgroundColor:C.surface},scroll:{flex:1},
  navbar:{backgroundColor:C.navy,paddingVertical:14,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'center'},
  navTitle:{color:C.white,fontSize:16,fontWeight:'600',flex:1,textAlign:'center'},
  burgerBtn:{position:'absolute',left:14,padding:6},
  burgerLine:{width:18,height:2,backgroundColor:C.white,borderRadius:1,marginVertical:2},
  backBtn:{position:'absolute',left:10,paddingVertical:4,paddingHorizontal:8},
  backTxt:{color:'#aac4e0',fontSize:14},
  lotBlock:{borderBottomWidth:0.5,borderBottomColor:C.border},
  lotStrip:{backgroundColor:'#f8f8f8',flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:7,gap:6},
  pill:{borderWidth:0.5,borderColor:C.border,borderRadius:5,paddingHorizontal:8,paddingVertical:3,backgroundColor:C.white},
  pillTxt:{fontSize:11,color:C.textPrimary},pillBold:{fontWeight:'600'},
  lotDesc:{marginLeft:'auto',fontSize:11,color:C.textTertiary,fontStyle:'italic',maxWidth:130},
  budgetWrap:{paddingHorizontal:12,paddingTop:8,paddingBottom:10,backgroundColor:'#f8f8f8'},
  budgetLabels:{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',marginBottom:6},
  budgetLeft:{fontSize:12,color:C.textSecond},budgetBold:{color:C.textPrimary,fontWeight:'600'},
  budgetStatus:{fontSize:12,fontWeight:'600'},
  barTrack:{height:8,backgroundColor:'#e0e0e0',borderRadius:4,overflow:'hidden'},
  barFill:{height:'100%',borderRadius:4},barHint:{fontSize:10,color:C.textTertiary,marginTop:4,textAlign:'right'},
  costPad:{padding:12,paddingBottom:10,borderBottomWidth:0.5,borderBottomColor:C.border},
  totalBox:{backgroundColor:C.totalRed,borderRadius:10,padding:12,marginBottom:8},
  totalLbl:{fontSize:11,color:C.totalRedLt,marginBottom:3},totalAmt:{fontSize:30,fontWeight:'600',color:C.white},
  hammerBox:{backgroundColor:C.hammerBlue,borderRadius:10,padding:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  hammerLbl:{fontSize:11,color:C.hammerBlueMd,marginBottom:3},hammerAmt:{fontSize:24,fontWeight:'600',color:C.hammerBlueDk},
  editHint:{fontSize:16,color:C.hammerBlueMd},
  qaPad:{padding:10,paddingHorizontal:12,borderBottomWidth:0.5,borderBottomColor:C.border},
  secLbl:{fontSize:11,color:C.textTertiary,marginBottom:6},
  qaRow:{flexDirection:'row',gap:6,marginBottom:8},
  qaChip:{flex:1,backgroundColor:C.quickBlue,borderWidth:0.5,borderColor:C.quickBlueBdr,borderRadius:8,paddingVertical:10,alignItems:'center'},
  qaChipTxt:{fontSize:13,fontWeight:'600',color:C.infoBlue},
  pctRow:{flexDirection:'row',gap:6},
  pctChip:{flex:1,backgroundColor:'#f8f8f8',borderWidth:0.5,borderColor:C.border,borderRadius:8,paddingVertical:7,alignItems:'center'},
  pctNum:{fontSize:12,fontWeight:'600',color:C.infoBlue},pctVal:{fontSize:10,color:C.textTertiary,marginTop:1},
  feePad:{paddingHorizontal:12,paddingVertical:2,borderBottomWidth:0.5,borderBottomColor:C.border},
  feeRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:9,borderBottomWidth:0.5,borderBottomColor:C.border},
  feeLabel:{flex:1,fontSize:14,color:C.textPrimary},
  feeVal:{fontSize:14,fontWeight:'600',color:C.infoBlue,minWidth:40,textAlign:'right'},feeValOff:{color:C.textTertiary,fontWeight:'400'},
  togTrack:{width:42,height:24,borderRadius:12,justifyContent:'center'},togOn:{backgroundColor:C.barGreen},togOff:{backgroundColor:'#ccc'},
  togThumb:{width:18,height:18,borderRadius:9,backgroundColor:C.white,position:'absolute'},togThumbOn:{right:3},togThumbOff:{left:3},
  actRow:{flexDirection:'row',gap:10,padding:12,borderBottomWidth:0.5,borderBottomColor:C.border},
  wonBtn:{flex:1,backgroundColor:C.green,borderRadius:10,paddingVertical:15,alignItems:'center'},wonTxt:{color:C.white,fontSize:16,fontWeight:'600'},
  lostBtn:{flex:1,backgroundColor:'#f0f0f0',borderWidth:0.5,borderColor:C.border,borderRadius:10,paddingVertical:15,alignItems:'center'},lostTxt:{color:C.textSecond,fontSize:16,fontWeight:'500'},
  statsRow:{flexDirection:'row',gap:8,padding:10,paddingHorizontal:12},
  statBid:{flex:1,backgroundColor:C.amber,borderRadius:9,padding:9},statLblLight:{fontSize:10,color:C.amberLt,marginBottom:3},statValLight:{fontSize:17,fontWeight:'600',color:C.white},
  statTotal:{flex:1,backgroundColor:'#f5f5f5',borderWidth:0.5,borderColor:C.border,borderRadius:9,padding:9},statLblDark:{fontSize:10,color:C.textTertiary,marginBottom:3},statValDark:{fontSize:17,fontWeight:'600',color:C.textPrimary},
  adBar:{backgroundColor:'#f5f5f5',borderTopWidth:0.5,borderTopColor:C.border,padding:14,alignItems:'center'},adTxt:{fontSize:13,color:C.textTertiary},
  menuBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  menuPanel:{position:'absolute',top:0,left:0,bottom:0,width:'72%',backgroundColor:C.white},
  menuHeader:{backgroundColor:C.navy,padding:16,flexDirection:'row',alignItems:'center'},
  menuItem:{paddingVertical:15,paddingHorizontal:18,borderBottomWidth:0.5,borderBottomColor:C.border},menuItemTxt:{fontSize:15,color:C.infoBlue},
  listItem:{flexDirection:'row',alignItems:'center',gap:12,padding:14,borderBottomWidth:0.5,borderBottomColor:C.border},
  listIconBox:{width:36,alignItems:'center'},listName:{fontSize:14,color:C.textPrimary,fontWeight:'500'},
  listMeta:{fontSize:11,color:C.textTertiary,marginTop:2},chevron:{fontSize:20,color:C.textTertiary},
  listTitleBar:{padding:10,paddingHorizontal:14,borderBottomWidth:0.5,borderBottomColor:C.border,backgroundColor:'#f8f8f8'},
  listTitleTxt:{fontSize:14,fontWeight:'600',color:C.textPrimary},listMetaTxt:{fontSize:11,color:C.textTertiary,marginTop:2},
  tableHeader:{backgroundColor:C.navy},
  tableRow:{flexDirection:'row',alignItems:'center',paddingVertical:8,paddingHorizontal:6,borderBottomWidth:0.5,borderBottomColor:C.border},
  tableRowAlt:{backgroundColor:'#f8f8f8'},tableRowCurrent:{backgroundColor:'#e8f0fa'},
  currentIndicator:{position:'absolute',left:0,top:0,bottom:0,width:3,backgroundColor:C.infoBlue},
  th:{fontSize:10,color:C.white,fontWeight:'600',paddingRight:4},td:{fontSize:10,color:C.textPrimary,paddingRight:4},
  tdYes:{color:C.greenText,fontWeight:'600'},tdNo:{color:C.textTertiary},
  tblActions:{flexDirection:'row',gap:6,padding:10,borderTopWidth:0.5,borderTopColor:C.border},
  tblBtn:{flex:1,borderRadius:8,paddingVertical:10,alignItems:'center'},
  tblBtnNavy:{backgroundColor:C.navy},tblBtnNavyTxt:{color:C.white,fontSize:12,fontWeight:'600'},
  tblBtnBlue:{backgroundColor:C.quickBlue,borderWidth:0.5,borderColor:C.quickBlueBdr},tblBtnBlueTxt:{color:C.infoBlue,fontSize:12,fontWeight:'500'},
  tblBtnGreen:{backgroundColor:C.greenLt,borderWidth:0.5,borderColor:C.greenBdr},tblBtnGreenTxt:{color:C.greenText,fontSize:12,fontWeight:'500'},
  settHead:{flexDirection:'row',alignItems:'center',gap:10,padding:16,borderBottomWidth:0.5,borderBottomColor:C.border},
  settTitle:{fontSize:20,color:C.infoBlue,fontWeight:'500'},
  settSectionLbl:{fontSize:10,color:C.textTertiary,letterSpacing:0.5,paddingHorizontal:14,paddingTop:14,paddingBottom:4},
  settRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14,paddingHorizontal:14,borderBottomWidth:0.5,borderBottomColor:C.border},
  settLabel:{fontSize:14,color:C.textPrimary},settVal:{fontSize:14,fontWeight:'600',color:C.infoBlue,borderBottomWidth:1,borderBottomColor:C.border},
  settHint:{padding:14,fontSize:12,color:C.textTertiary,lineHeight:18},
  modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.45)',justifyContent:'center',alignItems:'center'},
  modalBox:{backgroundColor:C.white,borderRadius:14,padding:20,width:260,borderWidth:0.5,borderColor:C.border},
  modalTitle:{fontSize:13,color:C.textSecond,marginBottom:10},
  modalValue:{fontSize:30,textAlign:'right',borderBottomWidth:2,borderBottomColor:C.infoBlue,paddingVertical:8,marginBottom:14,color:C.textPrimary,fontWeight:'500'},
  numpadGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  npBtn:{width:'30%',paddingVertical:13,backgroundColor:'#f5f5f5',borderRadius:9,borderWidth:0.5,borderColor:C.border,alignItems:'center'},
  npTxt:{fontSize:18,color:C.textPrimary},npOk:{backgroundColor:C.navy,borderColor:C.navy},npOkTxt:{color:C.white},npClrTxt:{color:C.danger},
  currGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  currOpt:{paddingVertical:9,paddingHorizontal:12,borderRadius:8,borderWidth:0.5,borderColor:C.border,backgroundColor:'#f5f5f5'},
  currOptSel:{backgroundColor:C.navy,borderColor:C.navy},currOptTxt:{fontSize:14,color:C.textPrimary},currOptTxtSel:{color:C.white},
  currCustom:{borderWidth:0.5,borderColor:C.border,borderRadius:8,padding:10,fontSize:18,textAlign:'center',marginTop:4,color:C.textPrimary},
  modalActions:{flexDirection:'row',gap:8,marginTop:16},
  modalActionBtn:{flex:1,paddingVertical:11,borderRadius:8,alignItems:'center'},
  modalCancel:{backgroundColor:'#f0f0f0',borderWidth:0.5,borderColor:C.border},modalCancelTxt:{fontSize:14,color:C.textSecond},
  modalOk:{backgroundColor:C.navy},modalOkTxt:{fontSize:14,color:C.white,fontWeight:'600'},
  createHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:C.border,backgroundColor:C.navy},
  createTitle:{fontSize:16,fontWeight:'600',color:C.white},createCancel:{fontSize:15,color:'#aac4e0'},createSave:{fontSize:15,color:'#7dd87d',fontWeight:'600'},
  createSection:{padding:14,borderBottomWidth:0.5,borderBottomColor:C.border},
  createSectionLbl:{fontSize:10,color:C.textTertiary,letterSpacing:0.5,marginBottom:8},
  createInput:{borderWidth:0.5,borderColor:C.border,borderRadius:9,padding:12,fontSize:15,color:C.textPrimary,backgroundColor:C.surface},
  lotEntryCard:{borderWidth:0.5,borderColor:C.border,borderRadius:9,padding:10,marginBottom:8,backgroundColor:'#f8f8f8'},
  lotEntryRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:6},
  lotEntryLbl:{fontSize:10,color:C.textTertiary,width:34},
  lotEntryInput:{borderWidth:0.5,borderColor:C.border,borderRadius:7,padding:7,fontSize:12,color:C.textPrimary,backgroundColor:C.white},
  togglePill:{paddingVertical:5,paddingHorizontal:8,borderRadius:6,borderWidth:0.5},
  togglePillOn:{backgroundColor:C.greenLt,borderColor:C.greenBdr},togglePillOff:{backgroundColor:'#f5f5f5',borderColor:C.border},
  togglePillTxt:{fontSize:10,fontWeight:'600'},togglePillTxtOn:{color:C.greenText},togglePillTxtOff:{color:C.textTertiary},
  addLotBtn:{borderWidth:0.5,borderStyle:'dashed',borderColor:C.borderMid,borderRadius:9,paddingVertical:11,alignItems:'center',marginTop:2},
  addLotTxt:{fontSize:13,color:C.infoBlue,fontWeight:'500'},
});

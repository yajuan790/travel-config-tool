import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

interface CanvasEditorProps {
  width?: number;
  height?: number;
}

// ==========================================
// 1. 全局常量定义 (放在组件外部，确保绝对可用)
// ==========================================

const DEFAULT_IMGS = {
    MIDDLE_BG: '/defaults/bg_map1.png',   
    RIGHT_BG: '/defaults/bg_map2.png',    
    POPUP_FRAME: '/defaults/popup_frame.png', 
    TICKET_BG: '/defaults/bg_map2.png',
    TICKET_LAYER: '/defaults/ticket.png',
    AIO_BG: '/defaults/bg_aio.png',
    MASK_DACHE: '/defaults/dache.png',
    MASK_SHUNFENGCHE: '/defaults/shunfengche.png',
    MASK_OTA: '/defaults/OTA.png',
    MASK_JINGWAI: '/defaults/jingwai.png',
};

// 左屏色板
const LEFT_PRESETS = [
    { name: '清凉蓝', top: '#EEFCFF', bottom: '#EEFCFF', bgTop: '#EEFCFF' },
    { name: '暖心粉', top: '#FFF0ED', bottom: '#FFF0ED', bgTop: '#FFF0ED' },
    { name: '活力绿', top: '#F9FFE4', bottom: '#F9FFE4', bgTop: '#F9FFE4' },
    { name: '明亮黄', top: '#FFF9E2', bottom: '#FFF9E2', bgTop: '#FFF9E2' },
];

// 通用色板
const COLOR_PRESETS = [
    { color: '#EEFCFF', name: '清凉蓝' },
    { color: '#FFF0ED', name: '暖心粉' },
    { color: '#F9FFE4', name: '活力绿' },
    { color: '#FFF9E2', name: '明亮黄' },
];

// ColorInput 组件
const ColorInput: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-16 font-bold text-gray-700">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-12 rounded-[8px] border border-gray-300 cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-6 px-2 text-xs rounded-[8px] border border-gray-300"
        style={{ backgroundColor: '#F3F3F5' }}
        placeholder="#000000"
      />
    </div>
  );
};

// ColorPalette 组件
const ColorPalette: React.FC<{ activeColor: string; onSelect: (color: string) => void }> = ({ activeColor, onSelect }) => {
  return (
    <div className="flex gap-2">
      {COLOR_PRESETS.map((preset) => (
        <div
          key={preset.name}
          onClick={() => onSelect(preset.color)}
          title={preset.name}
          className={`h-6 w-6 rounded cursor-pointer border-2 ${
            activeColor === preset.color ? 'border-blue-500' : 'border-gray-200'
          }`}
          style={{ backgroundColor: preset.color }}
        />
      ))}
    </div>
  );
};

// GradientPalette 组件（用于弹窗渐变选择）
const GradientPalette: React.FC<{ activeGradient: { bottom: string; top: string }; onSelect: (gradient: { bottom: string; top: string }) => void }> = ({ activeGradient, onSelect }) => {
  return (
    <div className="flex gap-2">
      {POPUP_GRADIENT_PRESETS.map((preset) => {
        const isActive = activeGradient.bottom === preset.bottom && activeGradient.top === preset.top;
        return (
          <div
            key={preset.name}
            onClick={() => onSelect(preset)}
            title={preset.name}
            className={`h-6 w-6 rounded cursor-pointer border-2 ${
              isActive ? 'border-blue-500' : 'border-gray-200'
            }`}
            style={{ background: `linear-gradient(to top, ${preset.bottom}, ${preset.top})` }}
          />
        );
      })}
    </div>
  );
};

const GRADIENT_BOTTOM_COLOR = '#F7F7F6';
const POPUP_BOTTOM_COLOR = '#F7F7F6';

// 弹窗渐变预设（从底部到顶部）
const POPUP_GRADIENT_PRESETS = [
  { name: '渐变1', bottom: '#EBF8FF', top: '#AAF2FE' },
  { name: '渐变2', bottom: '#FFEDEB', top: '#FFD3CA' },
  { name: '渐变3', bottom: '#F5FFEB', top: '#E7FAA2' },
  { name: '渐变4', bottom: '#FFFBEB', top: '#FFF1BB' },
];

// 全局背景色渐变预设（用于一键替换所有页面）
const GLOBAL_BG_GRADIENT_PRESETS = [
  { name: '渐变1', bottom: '#EBF8FF', top: '#AAF2FE' },
  { name: '渐变2', bottom: '#FFEDEB', top: '#FFD3CA' },
  { name: '渐变3', bottom: '#F5FFEB', top: '#E7FAA2' },
  { name: '渐变4', bottom: '#FFFBEB', top: '#FFF1BB' },
];

// 发券会场背景渐变预设（由下至上，底部固定为 #F7F7F6）
const LEFT_SCREEN_GRADIENT_PRESETS = [
  { name: '渐变1', bottom: '#F7F7F6', top: '#EBF8FF' },
  { name: '渐变2', bottom: '#F7F7F6', top: '#FFEDEB' },
  { name: '渐变3', bottom: '#F7F7F6', top: '#F5FFEB' },
  { name: '渐变4', bottom: '#F7F7F6', top: '#FFFBEB' },
];

const Z_INDEX = {
    BG_LAYER: 0, PHONE_BG: 5, GRADIENT: 10, 
    ICON_BG: 15, ASSET: 20, 
    FRAME: 30, POPUP_ASSET: 35, 
    CONTENT_LOW: 40, CONTENT_HIGH: 50, MASK: 100 
};

// 左屏 ID
const ID_BG_LAYER = 'layer_bg_gradient';
const ID_HEADER_LAYER = 'layer_header_image';
const ID_ASSET_PLACEHOLDER = 'layer_asset_placeholder';
const ID_ASSET_IMAGE = 'layer_asset_image';
const ID_TEXT_MAIN = 'text_main';
const ID_TEXT_SUB = 'text_sub';
const ID_TOP_MASK = 'layer_top_mask';

// 中屏 ID
const ID_MIDDLE_PHONE_BG = 'middle_phone_bg'; 
const ID_BANNER_BG = 'banner_bg';
const ID_BANNER_ICON_BG = 'banner_icon_bg'; 
const ID_BANNER_ICON_IMAGE = 'banner_icon_image';
const ID_BANNER_ICON_PLACEHOLDER = 'banner_icon_placeholder';
const ID_BANNER_TEXT_MAIN = 'banner_text_main';
const ID_BANNER_TEXT_SUB = 'banner_text_sub';
const ID_BANNER_TAG_BG = 'banner_tag_bg';
const ID_BANNER_TAG_TEXT = 'banner_tag_text';
const ID_BANNER_BTN_BG = 'banner_btn_bg';
const ID_BANNER_BTN_TEXT = 'banner_btn_text';

// 右屏 ID
const ID_POPUP_PHONE_BG = 'popup_phone_bg'; 
const ID_POPUP_GRADIENT_BG = 'popup_gradient_bg'; 
const ID_POPUP_ASSET_IMAGE = 'popup_asset_image'; 
const ID_POPUP_FIXED_FRAME = 'popup_fixed_frame'; 
const ID_POPUP_SUBTITLE = 'popup_subtitle';
const ID_POPUP_PRICE_NUM = 'popup_price_num';
const ID_POPUP_MAIN_TITLE = 'popup_main_title';
const ID_POPUP_BTN_BG = 'popup_btn_bg';
const ID_POPUP_BTN_TEXT = 'popup_btn_text';

// 领券弹窗 ID
const ID_TICKET_PHONE_BG = 'ticket_phone_bg';
const ID_TICKET_CONTAINER = 'ticket_container';
const ID_TICKET_GRADIENT_BG = 'ticket_gradient_bg';
const ID_TICKET_LAYER = 'ticket_layer';
const ID_TICKET_ASSET_IMAGE = 'ticket_asset_image';
const ID_TICKET_SUBTITLE = 'ticket_subtitle';
const ID_TICKET_TITLE = 'ticket_title';
const ID_TICKET_BTN_BG = 'ticket_btn_bg';
const ID_TICKET_BTN_TEXT = 'ticket_btn_text';

// AIO ID
const ID_AIO_PHONE_BG = 'aio_phone_bg';
const ID_AIO_DESC_TEXT = 'aio_desc_text';
const ID_AIO_CARD_BG = 'aio_card_bg';
const ID_AIO_CARD_BG_IMAGE = 'aio_card_bg_image';
const ID_AIO_ASSET_IMAGE = 'aio_asset_image';
const ID_AIO_SUBTITLE_TOP = 'aio_subtitle_top';
const ID_AIO_TITLE = 'aio_title';
const ID_AIO_SUBTITLE_BOTTOM = 'aio_subtitle_bottom';
const ID_AIO_BTN_BG = 'aio_btn_bg';
const ID_AIO_BTN_TEXT = 'aio_btn_text';

// ==========================================
// 2. 主组件
// ==========================================
const CanvasEditor: React.FC<CanvasEditorProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);

  const LEFT_SUB_LIMIT = 11;
  const LEFT_MAIN_LIMIT = 8;
  const BANNER_MAIN_LIMIT = 11;
  const BANNER_SUB_LIMIT = 14;
  const TICKET_SUBTITLE_LIMIT = 8;
  const TICKET_TITLE_LIMIT = 6;
  const POPUP_PRICE_LIMIT = 5;
  const AIO_SUBTITLE_TOP_LIMIT = 11;
  const AIO_TITLE_LIMIT = 6;
  const AIO_SUBTITLE_BOTTOM_LIMIT = 7;

  // --- 状态定义 ---
  // 全局背景色渐变（用于一键替换所有页面）
  const [globalBgGradient, setGlobalBgGradient] = useState({ bottom: '#EBF8FF', top: '#AAF2FE' });
  
  // 左屏 - 发券会场背景渐变（375x812区域自动跟随全局渐变）
  // 将全局渐变转换为发券会场格式（由下至上 #F7F7F6 → 全局渐变的底部颜色）
  const leftScreenGradient = { bottom: '#F7F7F6', top: globalBgGradient.bottom };
  const bgColorTop = leftScreenGradient.top;
  const bgColorBottom = leftScreenGradient.bottom;
  // 上方375x250区域使用全局渐变
  const headerGradient = globalBgGradient;
  const [mainTitle, setMainTitle] = useState('领100元打车券');
  const [mainTitleColor, setMainTitleColor] = useState('#000000');
  const [subTitle, setSubTitle] = useState('新人专属福利日');
  const [isComposingSubTitle, setIsComposingSubTitle] = useState(false);
  const [isComposingMainTitle, setIsComposingMainTitle] = useState(false);

  // 中屏
  const [bannerMainText, setBannerMainText] = useState('跑腿新客 领100元券包');
  const [bannerSubText, setBannerSubText] = useState('全城送 准时达');
  const [bannerTagText, setBannerTagText] = useState('暑期大放送');
  const [bannerBtnText, setBannerBtnText] = useState('去领取');
  // Banner图标背景使用全局渐变
  const [isComposingBannerMain, setIsComposingBannerMain] = useState(false);
  const [isComposingBannerSub, setIsComposingBannerSub] = useState(false);
  const [isComposingBannerBtn, setIsComposingBannerBtn] = useState(false);

  // 右屏 - 活动弹窗使用全局渐变
  const popupGradient = globalBgGradient;
  const [popupSubTitle, setPopupSubTitle] = useState('双旦出境游 打车更划算');
  const [popupPriceText, setPopupPriceText] = useState('领100元');
  const [popupMainTitle, setPopupMainTitle] = useState('境外打车券包');
  const [popupBtnText, setPopupBtnText] = useState('点击领券');
  const [isComposingPopupSubTitle, setIsComposingPopupSubTitle] = useState(false);
  const [isComposingPopupMainTitle, setIsComposingPopupMainTitle] = useState(false);
  const [isComposingPopupPriceText, setIsComposingPopupPriceText] = useState(false);

  // 领券弹窗 - 使用全局渐变
  const ticketGradient = globalBgGradient;
  const [ticketSubTitle, setTicketSubTitle] = useState('新春飞机火车出行');
  const [ticketTitleText, setTicketTitleText] = useState('领100元券包');
  const [ticketBtnText, setTicketBtnText] = useState('点击领券');
  const [isComposingTicketSubTitle, setIsComposingTicketSubTitle] = useState(false);
  const [isComposingTicketTitle, setIsComposingTicketTitle] = useState(false);

  // AIO - 使用全局渐变（改为渐变）
  const [aioDescText, setAioDescText] = useState('我领取了火车票和机票优惠券，你也来试试吧');
  const aioGradient = globalBgGradient;
  const [aioSubTitleTop, setAioSubTitleTop] = useState('暑期特惠');
  const [aioTitleText, setAioTitleText] = useState('领100元券包');
  const [aioSubTitleBottom, setAioSubTitleBottom] = useState('新人专属福利日');
  const [aioBtnText, setAioBtnText] = useState('去领取');
  const [isComposingAioSubTitleTop, setIsComposingAioSubTitleTop] = useState(false);
  const [isComposingAioTitle, setIsComposingAioTitle] = useState(false);
  const [isComposingAioSubTitleBottom, setIsComposingAioSubTitleBottom] = useState(false); 

  // 尺寸配置 (3x)
  const SCALE_FACTOR = 3; 
  const PHONE_WIDTH = 375 * SCALE_FACTOR; 
  const PHONE_HEIGHT = 812 * SCALE_FACTOR; 
  const GAP = 50 * SCALE_FACTOR; 

  const TOTAL_WIDTH = PHONE_WIDTH * 5 + GAP * 4;
  const TOTAL_HEIGHT = PHONE_HEIGHT;
  const px = (num: number) => num * SCALE_FACTOR;

  const SCREEN_1_X = 0;
  const SCREEN_2_X = PHONE_WIDTH + GAP;
  const SCREEN_3_X = (PHONE_WIDTH + GAP) * 2;
  const SCREEN_4_X = (PHONE_WIDTH + GAP) * 3;
  const SCREEN_5_X = (PHONE_WIDTH + GAP) * 4;

  const BANNER_W = 359 * SCALE_FACTOR;
  const BANNER_H = 104 * SCALE_FACTOR;
  const BANNER_OFFSET_X = SCREEN_2_X + ((PHONE_WIDTH - BANNER_W) / 2);
  const BANNER_OFFSET_Y = 419 * SCALE_FACTOR;

  const POPUP_W = 375 * SCALE_FACTOR;
  const POPUP_H = 556 * SCALE_FACTOR;
  const POPUP_CONTAINER_Y = (PHONE_HEIGHT - POPUP_H) / 2;
  const FRAME_W = 213 * SCALE_FACTOR; const FRAME_H = 210 * SCALE_FACTOR;
  const FRAME_ABS_Y = POPUP_CONTAINER_Y + (176 * SCALE_FACTOR);
  const FRAME_ABS_X = SCREEN_3_X + (PHONE_WIDTH - FRAME_W) / 2;

  // 领券弹窗尺寸
  const TICKET_CONTAINER_W = px(375);
  const TICKET_CONTAINER_H = px(556);
  const TICKET_CONTAINER_Y = (PHONE_HEIGHT - TICKET_CONTAINER_H) / 2;
  const TICKET_GRADIENT_W = px(247);
  const TICKET_GRADIENT_H = px(239);
  const TICKET_GRADIENT_X = SCREEN_4_X + (PHONE_WIDTH - TICKET_GRADIENT_W) / 2;
  const TICKET_GRADIENT_Y = TICKET_CONTAINER_Y + px(116);
  const TICKET_LAYER_W = px(247);
  const TICKET_LAYER_H = px(156);
  const TICKET_LAYER_X = TICKET_GRADIENT_X;
  const TICKET_LAYER_Y = TICKET_GRADIENT_Y + TICKET_GRADIENT_H - TICKET_LAYER_H;
  const TICKET_ASSET_SIZE = px(106);
  const TICKET_ASSET_X = SCREEN_4_X + PHONE_WIDTH - TICKET_ASSET_SIZE - px(56);
  // 素材区域在渐变区域顶部的基础上向上偏移 20px
  const TICKET_ASSET_Y = TICKET_GRADIENT_Y - px(20);
  const TICKET_SUBTITLE_X = TICKET_GRADIENT_X + px(11.5) + px(2);
  // 副标题整体下移 4px
  const TICKET_SUBTITLE_Y = TICKET_GRADIENT_Y + px(24 + 4);
  const TICKET_TITLE_X = TICKET_GRADIENT_X + px(11.5) + px(2);
  const TICKET_TITLE_Y = TICKET_GRADIENT_Y + px(33) + px(9) - px(8) + px(7);
  const TICKET_BTN_W = px(198);
  const TICKET_BTN_H = px(46);
  const TICKET_BTN_X = SCREEN_4_X + (PHONE_WIDTH - TICKET_BTN_W) / 2;
  const TICKET_BTN_Y = TICKET_GRADIENT_Y + TICKET_GRADIENT_H + px(29);

  const AIO_DESC_Y = px(166);
  const AIO_CARD_W = px(210);
  const AIO_CARD_H = px(168);
  const AIO_CARD_X = SCREEN_5_X + PHONE_WIDTH - px(78) - AIO_CARD_W;
  const AIO_CARD_Y = px(205);


  // --- 确保字符限制始终生效 ---
  useEffect(() => {
    if (!isComposingSubTitle && subTitle.length > LEFT_SUB_LIMIT) {
      setSubTitle(subTitle.slice(0, LEFT_SUB_LIMIT));
    }
  }, [subTitle, isComposingSubTitle]);
  
  useEffect(() => {
    if (!isComposingMainTitle && mainTitle.length > LEFT_MAIN_LIMIT) {
      setMainTitle(mainTitle.slice(0, LEFT_MAIN_LIMIT));
    }
  }, [mainTitle, isComposingMainTitle]);

  useEffect(() => {
    if (!isComposingBannerMain && bannerMainText.length > BANNER_MAIN_LIMIT) {
      setBannerMainText(bannerMainText.slice(0, BANNER_MAIN_LIMIT));
    }
  }, [bannerMainText, isComposingBannerMain]);

  useEffect(() => {
    if (!isComposingBannerSub && bannerSubText.length > BANNER_SUB_LIMIT) {
      setBannerSubText(bannerSubText.slice(0, BANNER_SUB_LIMIT));
    }
  }, [bannerSubText, isComposingBannerSub]);

  useEffect(() => {
    if (!isComposingPopupSubTitle && popupSubTitle.length > 11) {
      setPopupSubTitle(popupSubTitle.slice(0, 11));
    }
  }, [popupSubTitle, isComposingPopupSubTitle]);

  useEffect(() => {
    if (!isComposingPopupMainTitle && popupMainTitle.length > 6) {
      setPopupMainTitle(popupMainTitle.slice(0, 6));
    }
  }, [popupMainTitle, isComposingPopupMainTitle]);

  useEffect(() => {
    if (!isComposingPopupPriceText && popupPriceText.length > POPUP_PRICE_LIMIT) {
      setPopupPriceText(popupPriceText.slice(0, POPUP_PRICE_LIMIT));
    }
  }, [popupPriceText, isComposingPopupPriceText]);

  useEffect(() => {
    if (!isComposingAioSubTitleTop && aioSubTitleTop.length > AIO_SUBTITLE_TOP_LIMIT) {
      setAioSubTitleTop(aioSubTitleTop.slice(0, AIO_SUBTITLE_TOP_LIMIT));
    }
  }, [aioSubTitleTop, isComposingAioSubTitleTop]);

  useEffect(() => {
    if (!isComposingAioTitle && aioTitleText.length > AIO_TITLE_LIMIT) {
      setAioTitleText(aioTitleText.slice(0, AIO_TITLE_LIMIT));
    }
  }, [aioTitleText, isComposingAioTitle]);

  useEffect(() => {
    if (!isComposingAioSubTitleBottom && aioSubTitleBottom.length > AIO_SUBTITLE_BOTTOM_LIMIT) {
      setAioSubTitleBottom(aioSubTitleBottom.slice(0, AIO_SUBTITLE_BOTTOM_LIMIT));
    }
  }, [aioSubTitleBottom, isComposingAioSubTitleBottom]);

  useEffect(() => {
    if (!isComposingTicketSubTitle && ticketSubTitle.length > TICKET_SUBTITLE_LIMIT) {
      setTicketSubTitle(ticketSubTitle.slice(0, TICKET_SUBTITLE_LIMIT));
    }
  }, [ticketSubTitle, isComposingTicketSubTitle]);

  useEffect(() => {
    if (!isComposingTicketTitle && ticketTitleText.length > TICKET_TITLE_LIMIT) {
      setTicketTitleText(ticketTitleText.slice(0, TICKET_TITLE_LIMIT));
    }
  }, [ticketTitleText, isComposingTicketTitle]);

  // --- 初始化 Canvas ---
  useEffect(() => {
    if (!canvasRef.current) return;
    if (fabricCanvas) fabricCanvas.dispose();

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: TOTAL_WIDTH, height: TOTAL_HEIGHT,
      backgroundColor: '#111827', preserveObjectStacking: true, enableRetinaScaling: false, 
    });
    setFabricCanvas(canvas);

    // 1. 左屏
    const bgRect = new fabric.Rect({ left: SCREEN_1_X, top: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT, rx: px(40), ry: px(40), selectable: false, evented: false, originX: 'left', originY: 'top', data: { id: ID_BG_LAYER, zIndex: Z_INDEX.BG_LAYER } });
    bgRect.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: PHONE_HEIGHT, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: bgColorBottom }, { offset: 1, color: bgColorTop }] }));
    const headerRect = new fabric.Rect({ left: SCREEN_1_X, top: 0, width: PHONE_WIDTH, height: 250*SCALE_FACTOR, rx: px(40), ry: px(40), selectable: false, evented: false, data: { id: ID_HEADER_LAYER, zIndex: Z_INDEX.GRADIENT } });
    headerRect.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: 250*SCALE_FACTOR, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: headerGradient.bottom }, { offset: 1, color: headerGradient.top }] }));
    // 根据主标题长度动态计算字号和素材区域尺寸
    const mainTitleLen = mainTitle.length;
    const isShortTitle = mainTitleLen <= 6;
    const charFontSize = isShortTitle ? px(33) : px(30);
    const numFontSize = charFontSize * 1.35;
    const charSpacing = charFontSize * 0.03; // 字间距3%
    const numSpacing = -px(1); // DIN数字字间距-1px
    const assetSize = isShortTitle ? px(182) : px(164);
    
    const placeholder = new fabric.Rect({ left: SCREEN_1_X + PHONE_WIDTH - assetSize + px(10), top: px(56), width: assetSize, height: assetSize, fill: '#00FFFF', opacity: 0.3, selectable: false, evented: false, data: { id: ID_ASSET_PLACEHOLDER, zIndex: Z_INDEX.ASSET } });
    const textSubObj = new fabric.IText(subTitle, { left: px(20), top: px(108), fontSize: px(19), fill: '#000000', fontFamily: 'PingFang SC', fontWeight: 900, selectable: false, evented: false, data: { id: ID_TEXT_SUB, zIndex: Z_INDEX.CONTENT_HIGH } });
    const textMainObj = new fabric.IText(mainTitle, { left: px(20), top: px(108 + 24 - 3 - 10), fontSize: charFontSize, fill: mainTitleColor, fontFamily: 'MF FangHei', fontWeight: 'normal', selectable: false, evented: false, data: { id: ID_TEXT_MAIN, zIndex: Z_INDEX.CONTENT_HIGH } });
    
    // 应用字间距和数字样式，计算纵向对齐的deltaY
    // 可根据视觉效果调整这些值来优化纵向对齐
    const numDeltaY = 30; // 数字deltaY值，可调整
    const charDeltaY = (numFontSize - charFontSize) / 2; // 汉字deltaY值，可调整
    
    const mainTitleStyles: any = {};
    if (!mainTitleStyles[0]) mainTitleStyles[0] = {};
    for(let i = 0; i < mainTitle.length; i++) {
      const char = mainTitle[i];
      if (/\d/.test(char)) {
        mainTitleStyles[0][i] = { 
          fill: '#FF5024', 
          fontFamily: 'DIN', 
          fontWeight: 'bold', 
          fontSize: numFontSize, 
          deltaX: numSpacing,
          deltaY: numDeltaY
        };
      } else {
        // 汉字：应用字间距3%，下移使底部对齐
        mainTitleStyles[0][i] = { 
          fontSize: charFontSize,
          deltaX: charSpacing,
          deltaY: charDeltaY
        };
        if (char === '元' || char === '折') {
          mainTitleStyles[0][i].fill = '#FF5024';
        }
      }
    }
    textMainObj.set('styles', mainTitleStyles);
    canvas.add(bgRect, headerRect, placeholder, textSubObj, textMainObj);
    // 立即排序并渲染左屏元素
    const leftScreenObjs = [bgRect, headerRect, placeholder, textSubObj, textMainObj];
    leftScreenObjs.sort((a, b) => (a.data?.zIndex ?? 0) - (b.data?.zIndex ?? 0));
    leftScreenObjs.forEach((obj, index) => {
      const currentIndex = canvas.getObjects().indexOf(obj);
      if (currentIndex !== -1) {
        obj.moveTo(index);
      }
    });
    canvas.renderAll();
    // 默认加载境外打车图层
    fabric.Image.fromURL(DEFAULT_IMGS.MASK_JINGWAI, (img) => {
      if (img.getSrc()) {
        img.set({
          left: SCREEN_1_X,
          top: 0,
          scaleX: PHONE_WIDTH / img.width!,
          scaleY: PHONE_HEIGHT / img.height!,
            selectable: false,
            evented: false,
          data: { id: ID_TOP_MASK, zIndex: Z_INDEX.MASK }
        });
        canvas.add(img);
        sortLayers(canvas);
        canvas.renderAll();
      }
    });

    // 2. 中屏
    fabric.Image.fromURL(DEFAULT_IMGS.MIDDLE_BG, (img) => { if(img.getSrc()){ img.set({ left: SCREEN_2_X, top: 0, scaleX: Math.max(PHONE_WIDTH/img.width!, PHONE_HEIGHT/img.height!), scaleY: Math.max(PHONE_WIDTH/img.width!, PHONE_HEIGHT/img.height!), selectable: false, evented: false, clipPath: new fabric.Rect({ left: SCREEN_2_X, top: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT, absolutePositioned: true }), data: { id: ID_MIDDLE_PHONE_BG, zIndex: Z_INDEX.PHONE_BG } }); canvas.add(img); sortLayers(canvas); }});
    const bannerBg = new fabric.Rect({ left: BANNER_OFFSET_X, top: BANNER_OFFSET_Y, width: BANNER_W, height: BANNER_H, rx: px(16), ry: px(16), fill: '#FFFFFF', selectable: false, evented: false, data: { id: ID_BANNER_BG, zIndex: Z_INDEX.GRADIENT } });
    
    // 图标背景 (73x73)
    const iconBgSize = px(73);
    const iconX = BANNER_OFFSET_X + px(12);
    const iconY = BANNER_OFFSET_Y + (BANNER_H - iconBgSize)/2;
    const iconBg = new fabric.Rect({ left: iconX, top: iconY, width: iconBgSize, height: iconBgSize, rx: px(8), ry: px(8), selectable: false, evented: false, data: { id: ID_BANNER_ICON_BG, zIndex: Z_INDEX.ICON_BG } });
    iconBg.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: iconBgSize, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: globalBgGradient.bottom }, { offset: 1, color: globalBgGradient.top }] }));
    const iconImage = new fabric.Rect({ left: iconX, top: iconY, width: iconBgSize, height: iconBgSize, fill: 'transparent', opacity: 0, selectable: false, evented: false, data: { id: ID_BANNER_ICON_IMAGE, zIndex: Z_INDEX.ASSET } });

    const textLeftBase = BANNER_OFFSET_X + px(96); const textTopBase = BANNER_OFFSET_Y + px(16);
    const bannerMainTxt = new fabric.IText(bannerMainText, { left: textLeftBase, top: textTopBase, fontSize: px(16), fontFamily: 'PingFang SC', fontWeight: 900, fill: '#1B222A', selectable: false, evented: false, data: { id: ID_BANNER_TEXT_MAIN, zIndex: Z_INDEX.CONTENT_HIGH } });
    const bannerSubTxt = new fabric.Text(bannerSubText, { left: textLeftBase, top: textTopBase + px(16 + 7), fontSize: px(11), fontFamily: 'PingFang SC', fontWeight: 500, fill: '#666', selectable: false, evented: false, data: { id: ID_BANNER_TEXT_SUB, zIndex: Z_INDEX.CONTENT_HIGH } });
    const tagHeight = px(19); const tagTopY = BANNER_OFFSET_Y + BANNER_H - px(16) - tagHeight;
    const tagBg = new fabric.Rect({ left: textLeftBase, top: tagTopY, width: px(50), height: tagHeight, rx: px(6), ry: px(6), fill: '#FFE4DC', selectable: false, evented: false, data: { id: ID_BANNER_TAG_BG, zIndex: Z_INDEX.CONTENT_LOW } });
    const bannerTagTxt = new fabric.Text(bannerTagText, { left: textLeftBase, top: tagTopY + tagHeight/2, fontSize: px(11), fill: '#FF5024', fontFamily: 'PingFang SC', fontWeight: 900, originX: 'center', originY: 'center', selectable: false, evented: false, data: { id: ID_BANNER_TAG_TEXT, zIndex: Z_INDEX.CONTENT_HIGH } });
    const btnW = px(66); const btnH = px(32); const btnX = BANNER_OFFSET_X + BANNER_W - px(12) - btnW; const btnY = BANNER_OFFSET_Y + px(36);
    const btnBg = new fabric.Rect({ left: btnX, top: btnY, width: btnW, height: btnH, rx: px(8), ry: px(8), fill: '#FF5500', selectable: false, evented: false, data: { id: ID_BANNER_BTN_BG, zIndex: Z_INDEX.CONTENT_LOW } });
    const btnTxt = new fabric.Text(bannerBtnText, { left: btnX + btnW/2, top: btnY + btnH/2, fontSize: px(14), fill: '#FFF', fontFamily: 'PingFang SC', fontWeight: 'bold', originX: 'center', originY: 'center', selectable: false, evented: false, data: { id: ID_BANNER_BTN_TEXT, zIndex: Z_INDEX.CONTENT_HIGH } });
    canvas.add(bannerBg, iconBg, iconImage, tagBg, bannerTagTxt, bannerMainTxt, bannerSubTxt, btnBg, btnTxt);
    
    // ================= 3. 右屏 =================
    fabric.Image.fromURL(DEFAULT_IMGS.RIGHT_BG, (img) => { if(img.getSrc()){ img.set({ left: SCREEN_3_X, top: 0, scaleX: Math.max(PHONE_WIDTH/img.width!, PHONE_HEIGHT/img.height!), scaleY: Math.max(PHONE_WIDTH/img.width!, PHONE_HEIGHT/img.height!), selectable: false, evented: false, clipPath: new fabric.Rect({ left: SCREEN_3_X, top: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT, absolutePositioned: true }), data: { id: ID_POPUP_PHONE_BG, zIndex: Z_INDEX.PHONE_BG } }); canvas.add(img); sortLayers(canvas); }});
    const gradBgW = px(247); const gradBgH = px(253); const gradBgX = SCREEN_3_X + (PHONE_WIDTH - gradBgW) / 2; const gradBgY = POPUP_CONTAINER_Y + px(100);
    const popupGradBg = new fabric.Rect({ left: gradBgX, top: gradBgY, width: gradBgW, height: gradBgH, rx: px(20), ry: px(20), selectable: false, evented: false, data: { id: ID_POPUP_GRADIENT_BG, zIndex: Z_INDEX.GRADIENT } });
    popupGradBg.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: gradBgH, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: popupGradient.bottom }, { offset: 1, color: popupGradient.top }] }));
    canvas.add(popupGradBg);
    const popupAssetSize = px(190); const popupAssetX = SCREEN_3_X + (PHONE_WIDTH - popupAssetSize) / 2; const popupAssetY = POPUP_CONTAINER_Y + px(14); // 底部距离不变，从200改为190，top上移10px
    const popupAssetPlaceholder = new fabric.Rect({ left: popupAssetX, top: popupAssetY, width: popupAssetSize, height: popupAssetSize, fill: '#00FFFF', opacity: 0.3, selectable: false, evented: false, data: { id: ID_POPUP_ASSET_IMAGE, zIndex: Z_INDEX.POPUP_ASSET } });
    canvas.add(popupAssetPlaceholder);
    fabric.Image.fromURL(DEFAULT_IMGS.POPUP_FRAME, (img) => { if (img.getSrc()) { const tW = FRAME_W; const tH = FRAME_H; const tX = FRAME_ABS_X; const tY = FRAME_ABS_Y; const s = Math.max(tW / img.width!, tH / img.height!); const sW = img.width! * s; const sH = img.height! * s; const oX = (sW - tW) / 2; const oY = (sH - tH) / 2; img.set({ left: tX - oX, top: tY - oY, scaleX: s, scaleY: s, selectable: false, evented: false, clipPath: new fabric.Rect({ left: tX, top: tY, width: tW, height: tH, absolutePositioned: true }), data: { id: ID_POPUP_FIXED_FRAME, zIndex: Z_INDEX.FRAME } }); canvas.add(img); sortLayers(canvas); } else {
         const fallback = new fabric.Rect({ left: FRAME_ABS_X, top: FRAME_ABS_Y, width: FRAME_W, height: FRAME_H, fill: 'transparent', selectable: false, evented: false, data: { id: ID_POPUP_FIXED_FRAME, zIndex: Z_INDEX.FRAME } }); canvas.add(fallback);
    }});
    const pBtnW = px(167); const pBtnH = px(46); const pBtnX = SCREEN_3_X + (PHONE_WIDTH - pBtnW) / 2; const pBtnY = FRAME_ABS_Y + FRAME_H - px(15) - pBtnH;
    const pBtnBg = new fabric.Rect({ left: pBtnX, top: pBtnY, width: pBtnW, height: pBtnH, rx: px(8), ry: px(8), fill: '#FF5500', selectable: false, evented: false, data: { id: ID_POPUP_BTN_BG, zIndex: Z_INDEX.CONTENT_LOW } });
    const pBtnTxt = new fabric.Text(popupBtnText, { left: pBtnX + pBtnW/2, top: pBtnY + pBtnH/2, fontSize: px(20), fontFamily: 'PingFang SC', fontWeight: 900, fill: '#FFF', originX: 'center', originY: 'center', selectable: false, evented: false, data: { id: ID_POPUP_BTN_TEXT, zIndex: Z_INDEX.CONTENT_HIGH } });
    const textCenterX = SCREEN_3_X + PHONE_WIDTH / 2; const subTitleY = FRAME_ABS_Y + px(28) + 4 + 4 + 16 + 10; 
    const pSub = new fabric.Text(popupSubTitle, { left: textCenterX, top: subTitleY, fontSize: px(16), fontFamily: 'PingFang SC', fontWeight: 'bold', fill: '#333', originX: 'center', originY: 'top', selectable: false, evented: false, data: { id: ID_POPUP_SUBTITLE, zIndex: Z_INDEX.CONTENT_HIGH } });
    const redColor = '#FF5024'; const priceTop = subTitleY + px(16 + 8) - 4 - 4 - 8 - 8 - 4; const priceHeight = px(43); const priceCenterY = priceTop + priceHeight / 2 - px(2);
    const pPriceText = new fabric.IText(popupPriceText, { left: textCenterX, top: priceCenterY, fontSize: px(32), fontFamily: 'MF FangHei', fill: redColor, originX: 'center', originY: 'center', selectable: false, evented: false, data: { id: ID_POPUP_PRICE_NUM, zIndex: Z_INDEX.CONTENT_HIGH } });
    
    // 应用活动弹窗主标题样式：汉字间距3%，DIN数字字号为汉字1.35倍，数字间距-1px
    const popupCharFontSize = px(32);
    const popupNumFontSize = popupCharFontSize * 1.35;
    const popupCharSpacing = popupCharFontSize * 0.03; // 汉字间距3%
    const popupNumSpacing = -px(1); // 数字间距-1px
    const popupNumDeltaY = 30;
    const popupCharDeltaY = (popupNumFontSize - popupCharFontSize) / 2;
    const popupPriceStyles: any = {};
    if (!popupPriceStyles[0]) popupPriceStyles[0] = {};
    for(let i = 0; i < popupPriceText.length; i++) {
      const char = popupPriceText[i];
      if (/\d/.test(char)) {
        popupPriceStyles[0][i] = { fontFamily: 'DIN', fontWeight: 'bold', fontSize: popupNumFontSize, deltaY: popupNumDeltaY, deltaX: popupNumSpacing };
      } else if (char === '元' || char === '折') {
        popupPriceStyles[0][i] = { fontFamily: 'MF FangHei', fontWeight: 'normal', fontSize: popupCharFontSize, fill: '#FF5024', deltaY: popupCharDeltaY, deltaX: popupCharSpacing };
      } else {
        popupPriceStyles[0][i] = { fontFamily: 'MF FangHei', fontWeight: 'normal', fontSize: popupCharFontSize, deltaY: popupCharDeltaY, deltaX: popupCharSpacing };
      }
    }
    pPriceText.set('styles', popupPriceStyles);
    
    const mainTitleY = priceTop + priceHeight + px(14) - 8 - 8 + 2 + 2;
    const pMain = new fabric.Text(popupMainTitle, { left: textCenterX, top: mainTitleY, fontSize: px(26), fontFamily: 'PingFang SC', fontWeight: 900, fill: '#333', originX: 'center', originY: 'top', selectable: false, evented: false, data: { id: ID_POPUP_MAIN_TITLE, zIndex: Z_INDEX.CONTENT_HIGH } });
    canvas.add(pSub, pPriceText, pMain, pBtnBg, pBtnTxt);

    // ================= 4. 领券弹窗 =================
    fabric.Image.fromURL(DEFAULT_IMGS.TICKET_BG, (img) => { if(img.getSrc()){ img.set({ left: SCREEN_4_X, top: 0, scaleX: Math.max(PHONE_WIDTH/img.width!, PHONE_HEIGHT/img.height!), scaleY: Math.max(PHONE_WIDTH/img.width!, PHONE_HEIGHT/img.height!), selectable: false, evented: false, clipPath: new fabric.Rect({ left: SCREEN_4_X, top: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT, absolutePositioned: true }), data: { id: ID_TICKET_PHONE_BG, zIndex: Z_INDEX.PHONE_BG } }); canvas.add(img); sortLayers(canvas); }});
    const ticketGradBg = new fabric.Rect({ left: TICKET_GRADIENT_X, top: TICKET_GRADIENT_Y, width: TICKET_GRADIENT_W, height: TICKET_GRADIENT_H, rx: px(20), ry: px(20), selectable: false, evented: false, data: { id: ID_TICKET_GRADIENT_BG, zIndex: Z_INDEX.GRADIENT } });
    ticketGradBg.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: TICKET_GRADIENT_H, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: ticketGradient.bottom }, { offset: 1, color: ticketGradient.top }] }));
    canvas.add(ticketGradBg);
    fabric.Image.fromURL(DEFAULT_IMGS.TICKET_LAYER, (img) => { if (img.getSrc()) { const tW = TICKET_LAYER_W; const tH = TICKET_LAYER_H; const tX = TICKET_LAYER_X; const tY = TICKET_LAYER_Y; const s = Math.max(tW / img.width!, tH / img.height!); const sW = img.width! * s; const sH = img.height! * s; const oX = (sW - tW) / 2; const oY = (sH - tH) / 2; img.set({ left: tX - oX, top: tY - oY, scaleX: s, scaleY: s, selectable: false, evented: false, clipPath: new fabric.Rect({ left: tX, top: tY, width: tW, height: tH, absolutePositioned: true }), data: { id: ID_TICKET_LAYER, zIndex: Z_INDEX.FRAME } }); canvas.add(img); sortLayers(canvas); }});
    const ticketAssetPlaceholder = new fabric.Rect({ left: TICKET_ASSET_X, top: TICKET_ASSET_Y, width: TICKET_ASSET_SIZE, height: TICKET_ASSET_SIZE, fill: '#00FFFF', opacity: 0.3, selectable: false, evented: false, data: { id: ID_TICKET_ASSET_IMAGE, zIndex: Z_INDEX.ASSET } });
    canvas.add(ticketAssetPlaceholder);
    const ticketSub = new fabric.IText(ticketSubTitle, { left: TICKET_SUBTITLE_X, top: TICKET_SUBTITLE_Y, fontSize: px(17), fontFamily: 'PingFang SC', fontWeight: 'bold', fill: '#000', originX: 'left', originY: 'top', selectable: false, evented: false, data: { id: ID_TICKET_SUBTITLE, zIndex: Z_INDEX.CONTENT_HIGH } });
    const ticketTitle = new fabric.IText(ticketTitleText, { left: TICKET_TITLE_X, top: TICKET_TITLE_Y, fontSize: px(24), fontFamily: 'MF FangHei', fill: '#000000', originX: 'left', originY: 'top', selectable: false, evented: false, data: { id: ID_TICKET_TITLE, zIndex: Z_INDEX.CONTENT_HIGH } });
    const ticketTitleStyles: any = {};
    if (!ticketTitleStyles[0]) ticketTitleStyles[0] = {};
    // 遍历文本，数字部分使用DIN-Bold，其他使用MF FangHei
    // 汉字字号24px，数字字号为汉字1.35倍，汉字间距3%，数字间距-1px
    const ticketCharFontSize = px(24);
    const ticketNumFontSize = ticketCharFontSize * 1.35;
    const ticketCharSpacing = ticketCharFontSize * 0.03; // 汉字间距3%
    const ticketNumSpacing = -px(1); // 数字间距-1px
    const ticketNumDeltaY = 37; // 数字deltaY = 37
    const ticketCharDeltaY = 26; // 汉字deltaY = 26px
    for (let i = 0; i < ticketTitleText.length; i++) {
      const char = ticketTitleText[i];
      if (/\d/.test(char)) {
        // 数字部分：DIN-Bold，字号为汉字1.35倍，高亮橙#FF5024，间距-1px
        ticketTitleStyles[0][i] = { fontFamily: 'DIN', fontWeight: 'bold', fontSize: ticketNumFontSize, fill: '#FF5024', deltaY: ticketNumDeltaY, deltaX: ticketNumSpacing };
      } else if (char === '元' || char === '折') {
        // "元"和"折"字：MF FangHei，字号24，高亮橙#FF5024，间距3%
        ticketTitleStyles[0][i] = { fontFamily: 'MF FangHei', fontSize: ticketCharFontSize, fill: '#FF5024', deltaY: ticketCharDeltaY, deltaX: ticketCharSpacing };
      } else {
        // 其他文字部分：MF FangHei，字号24，黑色，间距3%
        ticketTitleStyles[0][i] = { fontFamily: 'MF FangHei', fontSize: ticketCharFontSize, fill: '#000000', deltaY: ticketCharDeltaY, deltaX: ticketCharSpacing };
      }
    }
    ticketTitle.set('styles', ticketTitleStyles);
    const ticketBtnBg = new fabric.Rect({ left: TICKET_BTN_X, top: TICKET_BTN_Y, width: TICKET_BTN_W, height: TICKET_BTN_H, rx: px(8), ry: px(8), fill: '#FF5500', selectable: false, evented: false, data: { id: ID_TICKET_BTN_BG, zIndex: Z_INDEX.CONTENT_LOW } });
    const ticketBtnTxt = new fabric.Text(ticketBtnText, { left: TICKET_BTN_X + TICKET_BTN_W/2, top: TICKET_BTN_Y + TICKET_BTN_H/2, fontSize: px(18), fontFamily: 'PingFang SC', fontWeight: 900, fill: '#FFF', originX: 'center', originY: 'center', selectable: false, evented: false, data: { id: ID_TICKET_BTN_TEXT, zIndex: Z_INDEX.CONTENT_HIGH } });
    canvas.add(ticketSub, ticketTitle, ticketBtnBg, ticketBtnTxt);

    // ================= 5. AIO 屏 =================
    fabric.Image.fromURL(DEFAULT_IMGS.AIO_BG, (img) => { const tX=SCREEN_5_X; if(img.getSrc()){ const s=Math.max(PHONE_WIDTH/img.width!,PHONE_HEIGHT/img.height!); img.set({left:tX,top:0,scaleX:s,scaleY:s,selectable:false,evented:false,clipPath:new fabric.Rect({left:tX,top:0,width:PHONE_WIDTH,height:PHONE_HEIGHT,absolutePositioned:true}),data:{id:ID_AIO_PHONE_BG,zIndex:Z_INDEX.PHONE_BG}}); canvas.add(img); sortLayers(canvas); }});
    const aioDesc = new fabric.Textbox(aioDescText, { left: AIO_CARD_X, top: AIO_DESC_Y, width: AIO_CARD_W, fontSize: px(13), fontFamily: 'PingFang SC', fontWeight: 500, fill: '#333', splitByGrapheme: true, selectable: false, evented: false, data: { id: ID_AIO_DESC_TEXT, zIndex: Z_INDEX.CONTENT_HIGH } });
    canvas.add(aioDesc);
    const aioCard = new fabric.Rect({ left: AIO_CARD_X, top: AIO_CARD_Y, width: AIO_CARD_W, height: AIO_CARD_H, selectable: false, evented: false, data: { id: ID_AIO_CARD_BG, zIndex: Z_INDEX.GRADIENT } });
    aioCard.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: AIO_CARD_H, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: aioGradient.bottom }, { offset: 1, color: aioGradient.top }] }));
    canvas.add(aioCard);
    const aioAssetSize = px(115); const aioAssetX = AIO_CARD_X + AIO_CARD_W - aioAssetSize; const aioAssetY = AIO_CARD_Y + AIO_CARD_H - aioAssetSize;
    const aioAssetPlaceholder = new fabric.Rect({ left: aioAssetX, top: aioAssetY, width: aioAssetSize, height: aioAssetSize, fill: '#00FFFF', opacity: 0.3, selectable: false, evented: false, data: { id: ID_AIO_ASSET_IMAGE, zIndex: Z_INDEX.ASSET } });
    canvas.add(aioAssetPlaceholder);
    const aioBaseLeft = AIO_CARD_X + px(9); 
    const aioSub1 = new fabric.Text(aioSubTitleTop, { left: aioBaseLeft, top: AIO_CARD_Y + px(16), fontSize: px(12), fontFamily: 'PingFang SC', fontWeight: 900, fill: '#1B222A', selectable: false, evented: false, data: { id: ID_AIO_SUBTITLE_TOP, zIndex: Z_INDEX.CONTENT_HIGH } });
    const aTitleTop = AIO_CARD_Y + px(16 + 12 + 8); const aTitleHeight = px(33); const aTitleCenterY = aTitleTop + aTitleHeight / 2 - 8 - 4 - px(2);
    const aioTitle = new fabric.IText(aioTitleText, { left: aioBaseLeft, top: aTitleCenterY, fontSize: px(26), fontFamily: 'MF FangHei', fill: '#000000', originY: 'center', selectable: false, evented: false, data: { id: ID_AIO_TITLE, zIndex: Z_INDEX.CONTENT_HIGH } });
    const aioTitleStylesInit: any = {};
    if (!aioTitleStylesInit[0]) aioTitleStylesInit[0] = {};
    // 汉字字号26px，数字字号为汉字1.35倍，汉字间距3%，数字间距-1px
    const aioCharFontSize = px(26);
    const aioNumFontSize = aioCharFontSize * 1.35;
    const aioCharSpacing = aioCharFontSize * 0.03; // 汉字间距3%
    const aioNumSpacing = -px(1); // 数字间距-1px
    const aioNumDeltaY = 26; // 数字deltaY = 26
    const aioCharDeltaY = (aioNumFontSize - aioCharFontSize) / 2;
    for(let i = 0; i < aioTitleText.length; i++) {
      const char = aioTitleText[i];
      if (/\d/.test(char)) {
        aioTitleStylesInit[0][i] = { fontFamily: 'DIN', fontWeight: 'bold', fontSize: aioNumFontSize, fill: '#FF5024', deltaY: aioNumDeltaY, deltaX: aioNumSpacing };
      } else if (char === '元' || char === '折') {
        aioTitleStylesInit[0][i] = { fontFamily: 'MF FangHei', fontWeight: 'normal', fontSize: aioCharFontSize, fill: '#FF5024', deltaY: aioCharDeltaY, deltaX: aioCharSpacing };
      } else {
        aioTitleStylesInit[0][i] = { fontFamily: 'MF FangHei', fontWeight: 'normal', fontSize: aioCharFontSize, fill: '#000000', deltaY: aioCharDeltaY, deltaX: aioCharSpacing };
      }
    }
    aioTitle.set('styles', aioTitleStylesInit);
    const sub2Top = aTitleTop + aTitleHeight + px(8) - 4; 
    const aioSub2 = new fabric.Text(aioSubTitleBottom, { left: aioBaseLeft, top: sub2Top, fontSize: px(13), fontFamily: 'PingFang SC', fontWeight: 900, fill: '#1B222A', selectable: false, evented: false, data: { id: ID_AIO_SUBTITLE_BOTTOM, zIndex: Z_INDEX.CONTENT_HIGH } });
    const aBtnY = AIO_CARD_Y + AIO_CARD_H - px(41) - px(28) + px(5); const aBtnX = aioBaseLeft;
    const aioBtnBg = new fabric.Rect({ left: aBtnX, top: aBtnY, width: px(66), height: px(28), rx: px(8), ry: px(8), fill: '#FF5500', selectable: false, evented: false, data: { id: ID_AIO_BTN_BG, zIndex: Z_INDEX.CONTENT_LOW } });
    const aioBtnTxt = new fabric.Text(aioBtnText, { left: aBtnX + px(33), top: aBtnY + px(14), fontSize: px(14), fontFamily: 'PingFang SC', fontWeight: 900, fill: '#FFF', originX: 'center', originY: 'center', selectable: false, evented: false, data: { id: ID_AIO_BTN_TEXT, zIndex: Z_INDEX.CONTENT_HIGH } });
    canvas.add(aioSub1, aioTitle, aioSub2, aioBtnBg, aioBtnTxt);

    setTimeout(() => { sortLayers(canvas); canvas.requestRenderAll(); }, 500);
    return () => { canvas.dispose(); };
  }, []);

  // --- 实时更新 ---
  useEffect(() => {
    if(!fabricCanvas) return;
    
    const bgObj = findObjectById(ID_BG_LAYER); if(bgObj && bgObj instanceof fabric.Rect) applyGradient(bgObj, bgColorTop, bgColorBottom);
    const headerObj = findObjectById(ID_HEADER_LAYER);
    if (headerObj && headerObj instanceof fabric.Rect) {
        headerObj.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: headerObj.height!, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: headerGradient.bottom }, { offset: 1, color: headerGradient.top }] }));
    }
    const mainTxt = findObjectById(ID_TEXT_MAIN) as fabric.IText; 
    if(mainTxt) { 
      // 根据主标题长度动态计算字号和素材区域尺寸
      const mainTitleLen = mainTitle.length;
      const isShortTitle = mainTitleLen <= 6;
      const charFontSize = isShortTitle ? px(33) : px(30);
      const numFontSize = charFontSize * 1.35;
      const charSpacing = charFontSize * 0.03; // 字间距3%
      const numSpacing = -px(1); // DIN数字字间距-1px
      const assetSize = isShortTitle ? px(182) : px(164);
      
      mainTxt.set({ text: mainTitle, fill: mainTitleColor, top: px(108 + 24 - 3 - 10), fontSize: charFontSize });
      
      // 更新素材区域尺寸
      const placeholder = findObjectById(ID_ASSET_PLACEHOLDER) as fabric.Rect;
      if (placeholder) {
        placeholder.set({ 
          left: SCREEN_1_X + PHONE_WIDTH - assetSize + px(10), 
          width: assetSize, 
          height: assetSize 
        });
      }
      const assetImg = findObjectById(ID_ASSET_IMAGE) as fabric.Image;
      if (assetImg) {
        const tX = SCREEN_1_X + PHONE_WIDTH - assetSize + px(10);
        const tY = px(56);
        assetImg.set({
          left: tX - (assetImg.width! * assetImg.scaleX! - assetSize) / 2,
          top: tY - (assetImg.height! * assetImg.scaleY! - assetSize) / 2
        });
        if (assetImg.clipPath && assetImg.clipPath instanceof fabric.Rect) {
          assetImg.clipPath.set({ left: tX, top: tY, width: assetSize, height: assetSize });
        }
      }
      
      const styles: any = {}; 
      if (!styles[0]) styles[0] = {};
      
      // 应用字间距和数字样式，计算纵向对齐的deltaY
      // 可根据视觉效果调整这些值来优化纵向对齐
      const numDeltaY = 30; // 数字deltaY值，可调整
      const charDeltaY = (numFontSize - charFontSize) / 2; // 汉字deltaY值，可调整
      
      for(let i = 0; i < mainTitle.length; i++) {
        const char = mainTitle[i];
        if (/\d/.test(char)) {
          styles[0][i] = { 
            fill: '#FF5024', 
            fontFamily: 'DIN', 
            fontWeight: 'bold', 
            fontSize: numFontSize, 
            deltaX: numSpacing,
            deltaY: numDeltaY
          };
        } else {
          // 汉字：应用字间距3%，下移使底部对齐
          styles[0][i] = { 
            fontSize: charFontSize,
            deltaX: charSpacing,
            deltaY: charDeltaY
          };
          if (char === '元' || char === '折') {
            styles[0][i].fill = '#FF5024';
          }
        }
      }
      mainTxt.set('styles', styles); 
      mainTxt.dirty = true;
      fabricCanvas.requestRenderAll();
    }
    const subTxt = findObjectById(ID_TEXT_SUB) as fabric.IText; 
    if(subTxt) { 
      subTxt.set({ text: subTitle, fill: '#000000', fontSize: px(19) }); 
    }
    
    const bMain = findObjectById(ID_BANNER_TEXT_MAIN) as fabric.IText; 
    if(bMain) { 
      bMain.set({ text: bannerMainText, fill: '#1B222A', fontFamily: 'PingFang SC', fontWeight: 900 }); 
      const styles: any = { 0: {} };
      // 自动识别并高亮所有数字、"元"和"折"字
      for(let i = 0; i < bannerMainText.length; i++) {
        const char = bannerMainText[i];
        if (/\d/.test(char) || char === '元' || char === '折') {
          styles[0][i] = { fill: '#FF5A00' };
        }
      }
      bMain.set('styles', styles); 
    }
    const bSub = findObjectById(ID_BANNER_TEXT_SUB) as fabric.Text; if(bSub) bSub.set({ text: bannerSubText });
    const bBtn = findObjectById(ID_BANNER_BTN_TEXT) as fabric.Text; if(bBtn) bBtn.set({ text: bannerBtnText });
    const bTag = findObjectById(ID_BANNER_TAG_TEXT) as fabric.Text; const bTagBg = findObjectById(ID_BANNER_TAG_BG) as fabric.Rect; if(bTag && bTagBg) { bTag.set({ text: bannerTagText }); const textWidth = bTag.width || 0; bTagBg.set({ width: textWidth + px(16) }); bTag.set({ left: bTagBg.left! + (textWidth + px(16))/2 }); }
    const iconBg = findObjectById(ID_BANNER_ICON_BG); 
    if(iconBg && iconBg instanceof fabric.Rect) { 
      iconBg.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: iconBg.height!, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: globalBgGradient.bottom }, { offset: 1, color: globalBgGradient.top }] }));
    }

    const pGrad = findObjectById(ID_POPUP_GRADIENT_BG);
    if(pGrad) { pGrad.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: pGrad.height!, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: popupGradient.bottom }, { offset: 1, color: popupGradient.top }] })); }
    const pSubT = findObjectById(ID_POPUP_SUBTITLE) as fabric.Text; if(pSubT) pSubT.set({ text: popupSubTitle, top: FRAME_ABS_Y + px(28) + 4 + 4 + 16 + 10 }); 
    const pPriceT = findObjectById(ID_POPUP_PRICE_NUM) as fabric.IText; 
    if(pPriceT) {
      const subTitleY = FRAME_ABS_Y + px(28) + 4 + 4 + 16 + 10;
      const priceTop = subTitleY + px(16 + 8) - 4 - 4 - 8 - 8 - 4;
      const priceHeight = px(43);
      const priceCenterY = priceTop + priceHeight / 2 - px(2);
      pPriceT.set({ text: popupPriceText, fill: '#FF5024', top: priceCenterY, fontSize: px(32) });
      const styles: any = {};
      if (!styles[0]) styles[0] = {};
      // 遍历文本，数字部分使用DIN-Bold，其他使用MF FangHei
      // 汉字字号32px，数字字号为汉字1.35倍，汉字间距3%，数字间距-1px
      const popupCharFontSize = px(32);
      const popupNumFontSize = popupCharFontSize * 1.35;
      const popupCharSpacing = popupCharFontSize * 0.03; // 汉字间距3%
      const popupNumSpacing = -px(1); // 数字间距-1px
      const popupNumDeltaY = 30; // 数字deltaY = 30
      const popupCharDeltaY = (popupNumFontSize - popupCharFontSize) / 2; // 汉字下移，使底部对齐
      
      for(let i = 0; i < popupPriceText.length; i++) {
        const char = popupPriceText[i];
        if (/\d/.test(char)) {
          // 数字部分：DIN-Bold，字号为汉字1.35倍，间距-1px
          styles[0][i] = { fontFamily: 'DIN', fontWeight: 'bold', fontSize: popupNumFontSize, deltaY: popupNumDeltaY, deltaX: popupNumSpacing };
        } else if (char === '元' || char === '折') {
          // "元"和"折"字：MF FangHei，字号32，高亮橙#FF5024，间距3%
          styles[0][i] = { fontFamily: 'MF FangHei', fontWeight: 'normal', fontSize: popupCharFontSize, fill: '#FF5024', deltaY: popupCharDeltaY, deltaX: popupCharSpacing };
        } else {
          // 其他汉字部分：MF FangHei，字号32，间距3%
          styles[0][i] = { fontFamily: 'MF FangHei', fontWeight: 'normal', fontSize: popupCharFontSize, deltaY: popupCharDeltaY, deltaX: popupCharSpacing };
        }
      }
      pPriceT.set('styles', styles);
      pPriceT.dirty = true;
    }
    const pMainT = findObjectById(ID_POPUP_MAIN_TITLE) as fabric.Text; 
    if(pMainT) {
      const subTitleY = FRAME_ABS_Y + px(28) + 4 + 4 + 16 + 10;
      const priceTop = subTitleY + px(16 + 8) - 4 - 4 - 8 - 8 - 4;
      const priceHeight = px(43);
      pMainT.set({ text: popupMainTitle, top: priceTop + priceHeight + px(14) - 8 - 8 + 2 + 2, fontFamily: 'PingFang SC', fontWeight: 900 });
    }
    const pBtnT = findObjectById(ID_POPUP_BTN_TEXT) as fabric.Text; if(pBtnT) pBtnT.set({ text: popupBtnText });

    // 领券弹窗更新
    const tGrad = findObjectById(ID_TICKET_GRADIENT_BG);
    if(tGrad) { tGrad.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: TICKET_GRADIENT_H, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: ticketGradient.bottom }, { offset: 1, color: ticketGradient.top }] })); }
    const tSubT = findObjectById(ID_TICKET_SUBTITLE) as fabric.IText; if(tSubT) tSubT.set({ text: ticketSubTitle, left: TICKET_SUBTITLE_X, top: TICKET_SUBTITLE_Y });
    const tTitleObj = findObjectById(ID_TICKET_TITLE) as fabric.IText;
    if(tTitleObj) {
      tTitleObj.set({ text: ticketTitleText, fill: '#000000', left: TICKET_TITLE_X, top: TICKET_TITLE_Y });
      // 先清除旧样式，确保新样式正确应用
      tTitleObj.set('styles', {});
      const styles: any = {};
      if (!styles[0]) styles[0] = {};
      // 遍历文本，数字部分使用DIN-Bold，其他使用MF FangHei
      // 汉字字号24px，数字字号为汉字1.35倍，汉字间距3%，数字间距-1px
      const ticketCharFontSize = px(24);
      const ticketNumFontSize = ticketCharFontSize * 1.35;
      const ticketCharSpacing = ticketCharFontSize * 0.03; // 汉字间距3%
      const ticketNumSpacing = -px(1); // 数字间距-1px
      const ticketNumDeltaY = 37; // 数字deltaY = 37
      const ticketCharDeltaY = 26; // 汉字deltaY = 26px
      for (let i = 0; i < ticketTitleText.length; i++) {
        const char = ticketTitleText[i];
        if (/\d/.test(char)) {
          // 数字部分：DIN-Bold，字号为汉字1.35倍，高亮橙#FF5024，间距-1px
          styles[0][i] = { fontFamily: 'DIN', fontWeight: 'bold', fontSize: ticketNumFontSize, fill: '#FF5024', deltaY: ticketNumDeltaY, deltaX: ticketNumSpacing };
        } else if (char === '元' || char === '折') {
          // "元"和"折"字：MF FangHei，字号24，高亮橙#FF5024，间距3%
          styles[0][i] = { fontFamily: 'MF FangHei', fontSize: ticketCharFontSize, fill: '#FF5024', deltaY: ticketCharDeltaY, deltaX: ticketCharSpacing };
        } else {
          // 其他文字部分：MF FangHei，字号24，黑色，间距3%
          styles[0][i] = { fontFamily: 'MF FangHei', fontSize: ticketCharFontSize, fill: '#000000', deltaY: ticketCharDeltaY, deltaX: ticketCharSpacing };
        }
      }
      tTitleObj.set('styles', styles);
      tTitleObj.dirty = true;
      tTitleObj.setCoords();
      fabricCanvas?.requestRenderAll();
    }
    const tBtnT = findObjectById(ID_TICKET_BTN_TEXT) as fabric.Text; if(tBtnT) tBtnT.set({ text: ticketBtnText });

    const aioDesc = findObjectById(ID_AIO_DESC_TEXT) as fabric.Textbox; if(aioDesc) aioDesc.set({ text: aioDescText });
    const aioGrad = findObjectById(ID_AIO_CARD_BG); 
    if(aioGrad && aioGrad instanceof fabric.Rect) { 
      aioGrad.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: aioGrad.height!, x2: 0, y2: 0 }, colorStops: [{ offset: 0, color: aioGradient.bottom }, { offset: 1, color: aioGradient.top }] }));
    }
    const aSub1 = findObjectById(ID_AIO_SUBTITLE_TOP) as fabric.Text; if(aSub1) aSub1.set({text: aioSubTitleTop});
    const aioTitleObj = findObjectById(ID_AIO_TITLE) as fabric.IText;
    if(aioTitleObj) {
      const aTitleTop = AIO_CARD_Y + px(16 + 12 + 8);
      const aTitleHeight = px(33);
      const aTitleCenterY = aTitleTop + aTitleHeight / 2 - 8 - 4 - px(2);
      aioTitleObj.set({ text: aioTitleText, fill: '#000000', top: aTitleCenterY });
      // 先清除旧样式
      aioTitleObj.set('styles', {});
      const styles: any = {};
      if (!styles[0]) styles[0] = {};
      // 遍历文本，数字部分使用红色和DIN-Bold，其他使用黑色和MF FangHei
      // 汉字字号26px，数字字号为汉字1.35倍，汉字间距3%，数字间距-1px
      const aioCharFontSize = px(26);
      const aioNumFontSize = aioCharFontSize * 1.35;
      const aioCharSpacing = aioCharFontSize * 0.03; // 汉字间距3%
      const aioNumSpacing = -px(1); // 数字间距-1px
      const aioNumDeltaY = 26; // 数字deltaY = 26
      const aioCharDeltaY = (aioNumFontSize - aioCharFontSize) / 2; // 汉字下移，使底部对齐
      for(let i = 0; i < aioTitleText.length; i++) {
        const char = aioTitleText[i];
        if (/\d/.test(char)) {
          // 数字部分：DIN-Bold，字号为汉字1.35倍，红色，间距-1px
          styles[0][i] = { fontFamily: 'DIN', fontWeight: 'bold', fontSize: aioNumFontSize, fill: '#FF5024', deltaY: aioNumDeltaY, deltaX: aioNumSpacing };
        } else if (char === '元' || char === '折') {
          // "元"和"折"字：MF FangHei，字号26，高亮橙#FF5024，间距3%
          styles[0][i] = { fontFamily: 'MF FangHei', fontWeight: 'normal', fontSize: aioCharFontSize, fill: '#FF5024', deltaY: aioCharDeltaY, deltaX: aioCharSpacing };
        } else {
          // 其他文字部分：MF FangHei，字号26，黑色，间距3%
          styles[0][i] = { fontFamily: 'MF FangHei', fontWeight: 'normal', fontSize: aioCharFontSize, fill: '#000000', deltaY: aioCharDeltaY, deltaX: aioCharSpacing };
        }
      }
      aioTitleObj.set('styles', styles);
      aioTitleObj.dirty = true;
      aioTitleObj.setCoords();
      fabricCanvas?.requestRenderAll();
    }
    const aSub2 = findObjectById(ID_AIO_SUBTITLE_BOTTOM) as fabric.Text; 
    if(aSub2) {
      const aTitleTop = AIO_CARD_Y + px(16 + 12 + 8);
      const aTitleHeight = px(33);
      aSub2.set({text: aioSubTitleBottom, top: aTitleTop + aTitleHeight + px(8) - 4});
    }
    const aBtnT = findObjectById(ID_AIO_BTN_TEXT) as fabric.Text; if(aBtnT) aBtnT.set({text: aioBtnText});

    sortLayers(fabricCanvas);
    fabricCanvas.requestRenderAll();
  }, [
      globalBgGradient, bgColorTop, bgColorBottom, headerGradient,
      mainTitle, mainTitleColor, subTitle,
      bannerMainText, bannerSubText, bannerTagText, bannerBtnText,
      popupSubTitle, popupPriceText, popupMainTitle, popupBtnText,
      ticketSubTitle, ticketTitleText, ticketBtnText,
      aioDescText, aioGradient, aioSubTitleTop, aioTitleText, aioSubTitleBottom, aioBtnText, 
      fabricCanvas
  ]);

  const findObjectById = (id: string) => fabricCanvas?.getObjects().find(o => o.data?.id === id);

  const sortLayers = (cvs = fabricCanvas) => {
     if(!cvs) return;
     const objs = cvs.getObjects();
     objs.sort((a, b) => (a.data?.zIndex ?? 0) - (b.data?.zIndex ?? 0));
     objs.forEach((obj, index) => obj.moveTo(index));
  };

  const applyGradient = (obj: fabric.Object, topColor: string, bottomColor: string) => {
      if(!topColor || !bottomColor) return;
      // 由下至上：y1=height (底部), y2=0 (顶部)
      obj.set('fill', new fabric.Gradient({
          type: 'linear', coords: { x1: 0, y1: obj.height!, x2: 0, y2: 0 },
          colorStops: [{ offset: 0, color: bottomColor }, { offset: 1, color: topColor }]
      }));
  };

  const handleLeftPresetClick = (preset: any) => {
      // 背景色已改为全局统一管理，headerGradient 现在直接使用 globalBgGradient
      const oldImg = findObjectById(ID_HEADER_LAYER);
      if (oldImg && oldImg instanceof fabric.Image) {
          fabricCanvas?.remove(oldImg);
          const headerRect = new fabric.Rect({ left: SCREEN_1_X, top: 0, width: PHONE_WIDTH, height: 250*SCALE_FACTOR, rx: px(40), ry: px(40), selectable: false, evented: false, data: { id: ID_HEADER_LAYER, zIndex: Z_INDEX.GRADIENT } });
          fabricCanvas?.add(headerRect);
          sortLayers(fabricCanvas);
      }
  };

  // 一键全屏替换
  const handleGlobalAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !fabricCanvas) return;
    const reader = new FileReader(); reader.onload = (f) => {
      const result = f.target?.result as string;
      fabric.Image.fromURL(result, (img) => { 
        const old=findObjectById(ID_ASSET_IMAGE); 
        if(old)fabricCanvas.remove(old); 
        findObjectById(ID_ASSET_PLACEHOLDER)?.set({opacity:0}); 
        // 根据当前主标题长度动态计算素材区域尺寸
        const mainTitleLen = mainTitle.length;
        const isShortTitle = mainTitleLen <= 6;
        const assetSize = isShortTitle ? px(182) : px(164);
        const tW = assetSize;
        const tH = assetSize;
        const tX = SCREEN_1_X + PHONE_WIDTH - tW + px(10);
        const tY = px(56);
        const s=Math.max(tW/img.width!,tH/img.height!); 
        const imgLeft = tX - (img.width! * s - tW) / 2;
        const imgTop = tY - (img.height! * s - tH) / 2;
        
        // 限制图片在375x812区域内，超出部分不显示
        // 计算裁剪区域：素材区域和375x812区域的交集
        const clipLeft = Math.max(SCREEN_1_X, tX);
        const clipTop = Math.max(0, tY);
        const clipRight = Math.min(SCREEN_1_X + PHONE_WIDTH, tX + tW);
        const clipBottom = Math.min(PHONE_HEIGHT, tY + tH);
        const clipWidth = clipRight - clipLeft;
        const clipHeight = clipBottom - clipTop;
        
        img.set({
          scaleX:s,
          scaleY:s,
          left:imgLeft,
          top:imgTop,
          selectable:false,
          evented:false,
          clipPath:new fabric.Rect({
            left:clipLeft,
            top:clipTop,
            width:clipWidth,
            height:clipHeight,
            absolutePositioned:true
          }),
          data:{id:ID_ASSET_IMAGE,zIndex:Z_INDEX.ASSET}
        });
        fabricCanvas.add(img);
        // 同时更新placeholder尺寸
        const placeholder = findObjectById(ID_ASSET_PLACEHOLDER) as fabric.Rect;
        if (placeholder) {
          placeholder.set({ left: tX, width: tW, height: tH });
        }
        sortLayers(); 
      });
      fabric.Image.fromURL(result, (img2) => { const old=findObjectById(ID_BANNER_ICON_IMAGE); if(old)fabricCanvas.remove(old); findObjectById(ID_BANNER_ICON_PLACEHOLDER)?.set({opacity:0}); const iconBgSize = px(73); const iconBgX = BANNER_OFFSET_X + px(12); const iconBgY = BANNER_OFFSET_Y + (BANNER_H - iconBgSize)/2; const tS=px(80); const s=Math.max(tS/img2.width!,tS/img2.height!); const imgWidth = img2.width! * s; const imgHeight = img2.height! * s; const tX = iconBgX + iconBgSize - tS; const tY = iconBgY + iconBgSize - tS; img2.set({scaleX:s,scaleY:s,left:tX-(imgWidth-tS)/2,top:tY-(imgHeight-tS)/2,selectable:false,evented:false,clipPath:new fabric.Rect({left:tX,top:tY,width:tS,height:tS,rx:px(8),ry:px(8),absolutePositioned:true}),data:{id:ID_BANNER_ICON_IMAGE,zIndex:Z_INDEX.ASSET}}); fabricCanvas.add(img2); sortLayers(); });
      fabric.Image.fromURL(result, (img3) => { const old=findObjectById(ID_POPUP_ASSET_IMAGE); if(old)fabricCanvas.remove(old); const tSize=px(190),tX=SCREEN_3_X+(PHONE_WIDTH-tSize)/2,tY=POPUP_CONTAINER_Y+px(14); const s=Math.max(tSize/img3.width!,tSize/img3.height!); img3.set({left:tX-(img3.width!*s-tSize)/2,top:tY,scaleX:s,scaleY:s,selectable:false,evented:false,clipPath:new fabric.Rect({left:tX,top:tY,width:tSize,height:tSize,absolutePositioned:true}),data:{id:ID_POPUP_ASSET_IMAGE,zIndex:Z_INDEX.POPUP_ASSET}}); fabricCanvas.add(img3); sortLayers(); });
      fabric.Image.fromURL(result, (img4) => { 
        const old = findObjectById(ID_TICKET_ASSET_IMAGE); 
        if(old) fabricCanvas.remove(old); 
        const tW = TICKET_ASSET_SIZE; 
        const tH = TICKET_ASSET_SIZE; 
        const tX = TICKET_ASSET_X; 
        const tY = TICKET_ASSET_Y; 
        const s = Math.max(tW/img4.width!, tH/img4.height!); 
        // 不再裁剪到247x239区域，保留完整106x106素材图
        img4.set({
          left: tX-(img4.width!*s-tW)/2, 
          top: tY-(img4.height!*s-tH)/2, 
          scaleX: s, 
          scaleY: s, 
          selectable: false, 
          evented: false, 
          data:{id:ID_TICKET_ASSET_IMAGE, zIndex: Z_INDEX.ASSET}
        }); 
        fabricCanvas.add(img4); 
        sortLayers(); 
        fabricCanvas.requestRenderAll(); 
      });
      fabric.Image.fromURL(result, (img5) => { const old = findObjectById(ID_AIO_ASSET_IMAGE); if(old) fabricCanvas.remove(old); const tW=px(115); const tH=px(115); const tX=AIO_CARD_X + AIO_CARD_W - tW; const tY=AIO_CARD_Y + AIO_CARD_H - tH; const s=Math.max(tW/img5.width!, tH/img5.height!); img5.set({left:tX-(img5.width!*s-tW)/2, top:tY-(img5.height!*s-tH)/2, scaleX:s, scaleY:s, selectable:false, evented:false, clipPath:new fabric.Rect({left:tX,top:tY,width:tW,height:tH,absolutePositioned:true}),data:{id:ID_AIO_ASSET_IMAGE, zIndex: Z_INDEX.ASSET}}); fabricCanvas.add(img5); sortLayers(); fabricCanvas.requestRenderAll(); });
    };
    reader.readAsDataURL(file);
  };

  const handleHeaderUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0];
    if(!file||!fabricCanvas)return; 
    const reader = new FileReader();
    reader.onload=(f)=>{ 
      const result = f.target?.result as string; 
      // 替换发券会场375x250区域背景图
      fabric.Image.fromURL(result,(img)=>{ 
        const old=findObjectById(ID_HEADER_LAYER); 
        if(old)fabricCanvas.remove(old); 
        const s=Math.max(PHONE_WIDTH/img.width!,(250*SCALE_FACTOR)/img.height!); 
        img.set({left:0,top:0,scaleX:s,scaleY:s,selectable:false,evented:false,clipPath:new fabric.Rect({left:0,top:0,width:PHONE_WIDTH,height:250*SCALE_FACTOR,rx:px(40),ry:px(40),absolutePositioned:true}),data:{id:ID_HEADER_LAYER,zIndex:Z_INDEX.GRADIENT}}); 
        fabricCanvas.add(img);
        sortLayers(); 
      }); 
      // 同步替换AIO的210x168区域背景图
      fabric.Image.fromURL(result,(img2)=>{ 
        const old = findObjectById(ID_AIO_CARD_BG_IMAGE); 
        if(old) fabricCanvas.remove(old); 
        const oldRect = findObjectById(ID_AIO_CARD_BG); 
        if(oldRect) oldRect.set({opacity:0}); 
        const tW = AIO_CARD_W; 
        const tH = AIO_CARD_H; 
        const tX = AIO_CARD_X; 
        const tY = AIO_CARD_Y; 
        const s = Math.max(tW/img2.width!, tH/img2.height!); 
        img2.set({left:tX-(img2.width!*s-tW)/2, top:tY-(img2.height!*s-tH)/2, scaleX:s, scaleY:s, selectable:false, evented:false, clipPath:new fabric.Rect({left:tX,top:tY,width:tW,height:tH,absolutePositioned:true}),data:{id:ID_AIO_CARD_BG_IMAGE, zIndex: Z_INDEX.GRADIENT}}); 
        fabricCanvas.add(img2); 
        sortLayers(); 
        fabricCanvas.requestRenderAll(); 
      });
    };
    reader.readAsDataURL(file);
  };
  const handleMaskSelect = (maskType: 'dache' | 'shunfengche' | 'OTA' | 'jingwai') => {
    if (!fabricCanvas) return;
    const maskPath = maskType === 'dache' ? DEFAULT_IMGS.MASK_DACHE :
                     maskType === 'shunfengche' ? DEFAULT_IMGS.MASK_SHUNFENGCHE :
                     maskType === 'OTA' ? DEFAULT_IMGS.MASK_OTA :
                     DEFAULT_IMGS.MASK_JINGWAI;
    
    fabric.Image.fromURL(maskPath, (img) => {
      const old = findObjectById(ID_TOP_MASK);
      if (old) fabricCanvas.remove(old);
      img.set({
        left: 0,
        top: 0,
        scaleX: PHONE_WIDTH / img.width!,
        scaleY: PHONE_HEIGHT / img.height!,
        selectable: false,
        evented: false,
        data: { id: ID_TOP_MASK, zIndex: Z_INDEX.MASK }
      });
      fabricCanvas.add(img);
      sortLayers();
        fabricCanvas.requestRenderAll();
    });
  };
  const handleRightBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if(!file||!fabricCanvas)return; const reader = new FileReader(); reader.onload=(f)=>{ fabric.Image.fromURL(f.target?.result as string,(img)=>{ const old=findObjectById(ID_MIDDLE_PHONE_BG); if(old)fabricCanvas.remove(old); const tX=PHONE_WIDTH+GAP; const s=Math.max(PHONE_WIDTH/img.width!,PHONE_HEIGHT/img.height!); img.set({left:tX,top:0,scaleX:s,scaleY:s,selectable:false,evented:false,clipPath:new fabric.Rect({left:tX,top:0,width:PHONE_WIDTH,height:PHONE_HEIGHT,absolutePositioned:true}),data:{id:ID_MIDDLE_PHONE_BG,zIndex:Z_INDEX.PHONE_BG}}); fabricCanvas.add(img); sortLayers(); })}; reader.readAsDataURL(file); };
  const handlePopupBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if(!file||!fabricCanvas)return; const reader = new FileReader(); reader.onload=(f)=>{ fabric.Image.fromURL(f.target?.result as string,(img)=>{ const old=findObjectById(ID_POPUP_PHONE_BG); if(old)fabricCanvas.remove(old); const tX=SCREEN_3_X; const s=Math.max(PHONE_WIDTH/img.width!,PHONE_HEIGHT/img.height!); img.set({left:tX,top:0,scaleX:s,scaleY:s,selectable:false,evented:false,clipPath:new fabric.Rect({left:tX,top:0,width:PHONE_WIDTH,height:PHONE_HEIGHT,absolutePositioned:true}),data:{id:ID_POPUP_PHONE_BG,zIndex:Z_INDEX.PHONE_BG}}); fabricCanvas.add(img); sortLayers(); })}; reader.readAsDataURL(file); };
  const handlePopupAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if(!file||!fabricCanvas)return; const reader = new FileReader(); reader.onload=(f)=>{ fabric.Image.fromURL(f.target?.result as string,(img)=>{ const old=findObjectById(ID_POPUP_ASSET_IMAGE); if(old)fabricCanvas.remove(old); const tSize=px(190); const tX=SCREEN_3_X+(PHONE_WIDTH-tSize)/2; const tY=POPUP_CONTAINER_Y+px(14); const s=Math.max(tSize/img.width!,tSize/img.height!); img.set({left:tX-(img.width!*s-tSize)/2,top:tY,scaleX:s,scaleY:s,selectable:false,evented:false,clipPath:new fabric.Rect({left:tX,top:tY,width:tSize,height:tSize,absolutePositioned:true}),data:{id:ID_POPUP_ASSET_IMAGE,zIndex:Z_INDEX.POPUP_ASSET}}); fabricCanvas.add(img); sortLayers(); })}; reader.readAsDataURL(file); };
  const handlePopupFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if(!file||!fabricCanvas)return; const reader = new FileReader(); reader.onload=(f)=>{ fabric.Image.fromURL(f.target?.result as string,(img)=>{ const old=findObjectById(ID_POPUP_FIXED_FRAME); if(old)fabricCanvas.remove(old); const tW=FRAME_W; const tH=FRAME_H; const tX=FRAME_ABS_X; const tY=FRAME_ABS_Y; const s=Math.max(tW/img.width!,tH/img.height!); const sW=img.width!*s; const sH=img.height!*s; const oX=(sW-tW)/2; const oY=(sH-tH)/2; img.set({left:tX-oX,top:tY-oY,scaleX:s,scaleY:s,selectable:false,evented:false,clipPath:new fabric.Rect({left:tX,top:tY,width:tW,height:tH,absolutePositioned:true}),data:{id:ID_POPUP_FIXED_FRAME,zIndex:Z_INDEX.FRAME}}); fabricCanvas.add(img); sortLayers(); }); }; reader.readAsDataURL(file); };
  const handleBannerIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !fabricCanvas) return; const reader = new FileReader(); reader.onload = (f) => { fabric.Image.fromURL(f.target?.result as string, (img) => { const old = findObjectById(ID_BANNER_ICON_IMAGE); if(old) fabricCanvas.remove(old); findObjectById(ID_BANNER_ICON_PLACEHOLDER)?.set({opacity:0}); const iconBgSize = px(73); const iconBgX = BANNER_OFFSET_X + px(12); const iconBgY = BANNER_OFFSET_Y + (BANNER_H - iconBgSize)/2; const tS = px(80); const s = Math.max(tS/img.width!, tS/img.height!); const imgWidth = img.width! * s; const imgHeight = img.height! * s; const tX = iconBgX + iconBgSize - tS; const tY = iconBgY + iconBgSize - tS; img.set({scaleX:s,scaleY:s,left:tX-(imgWidth-tS)/2,top:tY-(imgHeight-tS)/2,selectable:false,evented:false,clipPath:new fabric.Rect({left:tX,top:tY,width:tS,height:tS,rx:px(8),ry:px(8),absolutePositioned:true}),data:{id:ID_BANNER_ICON_IMAGE,zIndex:Z_INDEX.ASSET}}); fabricCanvas.add(img); sortLayers(); fabricCanvas.requestRenderAll(); }); }; reader.readAsDataURL(file); }
  const handleAioCardBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !fabricCanvas) return; const reader = new FileReader(); reader.onload = (f) => { fabric.Image.fromURL(f.target?.result as string, (img) => { const old = findObjectById(ID_AIO_CARD_BG_IMAGE); if(old) fabricCanvas.remove(old); const oldRect = findObjectById(ID_AIO_CARD_BG); if(oldRect) oldRect.set({opacity:0}); const tW = AIO_CARD_W; const tH = AIO_CARD_H; const tX = AIO_CARD_X; const tY = AIO_CARD_Y; const s = Math.max(tW/img.width!, tH/img.height!); img.set({left:tX-(img.width!*s-tW)/2, top:tY-(img.height!*s-tH)/2, scaleX:s, scaleY:s, selectable:false, evented:false, clipPath:new fabric.Rect({left:tX,top:tY,width:tW,height:tH,absolutePositioned:true}),data:{id:ID_AIO_CARD_BG_IMAGE, zIndex: Z_INDEX.GRADIENT}}); fabricCanvas.add(img); sortLayers(); fabricCanvas.requestRenderAll(); }); }; reader.readAsDataURL(file); };
  const handleTicketAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !fabricCanvas) return; const reader = new FileReader(); reader.onload = (f) => { fabric.Image.fromURL(f.target?.result as string, (img) => { const old = findObjectById(ID_TICKET_ASSET_IMAGE); if(old) fabricCanvas.remove(old); const tW = TICKET_ASSET_SIZE; const tH = TICKET_ASSET_SIZE; const tX = TICKET_ASSET_X; const tY = TICKET_ASSET_Y; const s = Math.max(tW/img.width!, tH/img.height!); img.set({left:tX-(img.width!*s-tW)/2, top:tY-(img.height!*s-tH)/2, scaleX:s, scaleY:s, selectable:false, evented:false, clipPath:new fabric.Rect({left:TICKET_GRADIENT_X,top:TICKET_GRADIENT_Y,width:TICKET_GRADIENT_W,height:TICKET_GRADIENT_H,absolutePositioned:true}),data:{id:ID_TICKET_ASSET_IMAGE, zIndex: Z_INDEX.ASSET}}); fabricCanvas.add(img); sortLayers(); fabricCanvas.requestRenderAll(); }); }; reader.readAsDataURL(file); };

  const download = (name: string, opts: any) => { 
    if(!fabricCanvas) return; 
    // 如果是375x812的下载，使用透明背景
    const isFullScreen = opts.width === PHONE_WIDTH && opts.height === PHONE_HEIGHT;
    const originalBg = fabricCanvas.backgroundColor || '#111827';
    if (isFullScreen) {
      fabricCanvas.setBackgroundColor('', () => {
    fabricCanvas.renderAll();
        setTimeout(() => { 
          const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1, ...opts }); 
          fabricCanvas.setBackgroundColor(originalBg, () => {
            fabricCanvas.renderAll();
            const link = document.createElement('a'); 
            link.download = name; 
            link.href = dataURL; 
            document.body.appendChild(link); 
            link.click(); 
            document.body.removeChild(link); 
          });
        }, 50); 
      });
    } else {
      fabricCanvas.renderAll(); 
      setTimeout(() => { 
        const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1, ...opts }); 
    const link = document.createElement('a');
        link.download = name; 
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
      }, 50); 
    }
  }
  const downloadRedBoxArea = () => { if(!fabricCanvas) return; const phoneBg = findObjectById(ID_MIDDLE_PHONE_BG); const bannerBg = findObjectById(ID_BANNER_BG); let pbv=true, bbv=true; if(phoneBg){pbv=phoneBg.visible!; phoneBg.visible=false;} if(bannerBg){bbv=bannerBg.visible!; bannerBg.visible=false;} fabricCanvas.renderAll(); setTimeout(()=>{ const dataURL=fabricCanvas.toDataURL({format:'png',quality:1,multiplier:1,left:BANNER_OFFSET_X,top:BANNER_OFFSET_Y,width:px(92),height:104*SCALE_FACTOR}); if(phoneBg)phoneBg.visible=pbv; if(bannerBg)bannerBg.visible=bbv; fabricCanvas.renderAll(); const link=document.createElement('a'); link.download=`banner_icon_${Date.now()}.png`; link.href=dataURL; document.body.appendChild(link); link.click(); document.body.removeChild(link); },50); }
  const downloadBannerCutArea = () => { 
      if(!fabricCanvas) return;
    const phoneBg = findObjectById(ID_MIDDLE_PHONE_BG); 
    const bannerBg = findObjectById(ID_BANNER_BG); 
    let pbv=true, bbv=true; 
    const originalBg = fabricCanvas.backgroundColor || '#111827';
    if(phoneBg){pbv=phoneBg.visible!; phoneBg.visible=false;} 
    if(bannerBg){bbv=bannerBg.visible!; bannerBg.visible=false;} 
    fabricCanvas.setBackgroundColor('', () => {
      fabricCanvas.renderAll(); 
      setTimeout(()=>{ 
        // multiplier 设为 1：画布尺寸本身是原图的 3 倍，导出即为原尺寸 3 倍
        const dataURL=fabricCanvas.toDataURL({format:'png',quality:1,multiplier:1,left:BANNER_OFFSET_X,top:BANNER_OFFSET_Y,width:px(92),height:104*SCALE_FACTOR}); 
        if(phoneBg)phoneBg.visible=pbv; 
        if(bannerBg)bannerBg.visible=bbv; 
        fabricCanvas.setBackgroundColor(originalBg, () => {
    fabricCanvas.renderAll();
          const link=document.createElement('a'); 
          link.download=`banner_切图92x104_${Date.now()}.png`; 
          link.href=dataURL; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
        });
      },50); 
    });
  }
  const downloadPopupArea = () => { 
    if(!fabricCanvas) return; 
    const phoneBg = findObjectById(ID_POPUP_PHONE_BG); 
    let wasVisible = true; 
    const originalBg = fabricCanvas.backgroundColor || '#111827';
    if(phoneBg) { 
      wasVisible = phoneBg.visible!; 
      phoneBg.visible = false; 
    } 
    fabricCanvas.setBackgroundColor('', () => {
      fabricCanvas.renderAll(); 
      setTimeout(() => { 
        const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1, left: SCREEN_3_X, top: POPUP_CONTAINER_Y, width: POPUP_W, height: POPUP_H }); 
        if(phoneBg) phoneBg.visible = wasVisible; 
        fabricCanvas.setBackgroundColor(originalBg, () => {
          fabricCanvas.renderAll(); 
    const link = document.createElement('a');
          link.download = `popup_area_transparent_${Date.now()}.png`; 
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
        });
      }, 50); 
    });
  }
  const downloadHeaderArea = () => { if(!fabricCanvas) return; const mask = findObjectById(ID_TOP_MASK); let maskVisible = true; if(mask) { maskVisible = mask.visible!; mask.visible = false; } const headerObj = findObjectById(ID_HEADER_LAYER); let headerRx = 0; let headerRy = 0; let headerClipPath: any = null; if(headerObj) { if(headerObj instanceof fabric.Rect) { headerRx = headerObj.rx || 0; headerRy = headerObj.ry || 0; headerObj.set({ rx: 0, ry: 0 }); } else if(headerObj instanceof fabric.Image && headerObj.clipPath) { headerClipPath = headerObj.clipPath; const clipRect = headerClipPath as fabric.Rect; headerRx = clipRect.rx || 0; headerRy = clipRect.ry || 0; clipRect.set({ rx: 0, ry: 0 }); } } const headerW = PHONE_WIDTH; const headerH = 250 * SCALE_FACTOR; fabricCanvas.renderAll(); setTimeout(() => { const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1, left: SCREEN_1_X, top: 0, width: headerW, height: headerH }); if(headerObj) { if(headerObj instanceof fabric.Rect) { headerObj.set({ rx: headerRx, ry: headerRy }); } else if(headerObj instanceof fabric.Image && headerClipPath) { (headerClipPath as fabric.Rect).set({ rx: headerRx, ry: headerRy }); } } if(mask) mask.visible = maskVisible; fabricCanvas.renderAll(); const link = document.createElement('a'); link.download = `头图375x250_${Date.now()}.png`; link.href = dataURL; document.body.appendChild(link); link.click(); document.body.removeChild(link); }, 50); }
  const downloadTicketArea = () => { 
    if(!fabricCanvas) return; 
    const phoneBg = findObjectById(ID_TICKET_PHONE_BG); 
    let phoneBgVisible = true; 
    if(phoneBg) { 
      phoneBgVisible = phoneBg.visible!; 
      phoneBg.visible = false; 
    } 
    const ticketLayer = findObjectById(ID_TICKET_LAYER);
    let ticketLayerVisible = true;
    if(ticketLayer) {
      ticketLayerVisible = ticketLayer.visible!;
      ticketLayer.visible = false;
    }
    const originalBg = fabricCanvas.backgroundColor || '#111827'; 
    fabricCanvas.setBackgroundColor('', () => { 
      fabricCanvas.renderAll(); 
      setTimeout(() => { 
        const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1, left: SCREEN_4_X, top: TICKET_CONTAINER_Y, width: TICKET_CONTAINER_W, height: TICKET_CONTAINER_H }); 
        fabricCanvas.setBackgroundColor(originalBg, () => { 
          if(phoneBg) phoneBg.visible = phoneBgVisible; 
          if(ticketLayer) ticketLayer.visible = ticketLayerVisible;
          fabricCanvas.renderAll(); 
          const link = document.createElement('a'); 
          link.download = `领券弹窗区域375x556_${Date.now()}.png`; 
          link.href = dataURL; 
          document.body.appendChild(link); 
          link.click(); 
          document.body.removeChild(link); 
        }); 
      }, 50); 
    }); 
  }
  const downloadAioFull = () => { 
      if(!fabricCanvas) return;
    const originalBg = fabricCanvas.backgroundColor || '#111827';
    fabricCanvas.setBackgroundColor('', () => {
      fabricCanvas.renderAll(); 
      setTimeout(() => { 
        const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1, left: SCREEN_5_X, top: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT }); 
        fabricCanvas.setBackgroundColor(originalBg, () => {
          fabricCanvas.renderAll();
          const link = document.createElement('a'); 
          link.download = `AIO分享全图375x812_${Date.now()}.png`; 
          link.href = dataURL; 
          document.body.appendChild(link); 
          link.click(); 
          document.body.removeChild(link); 
        });
      }, 50); 
    });
  }
  const downloadAioCut = () => { if(!fabricCanvas) return; const originalBg = fabricCanvas.backgroundColor || '#111827'; fabricCanvas.setBackgroundColor('', () => { fabricCanvas.renderAll(); setTimeout(() => { const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1, left: AIO_CARD_X, top: AIO_CARD_Y, width: AIO_CARD_W, height: AIO_CARD_H }); fabricCanvas.setBackgroundColor(originalBg, () => { fabricCanvas.renderAll(); const link = document.createElement('a'); link.download = `分享图切图210x168_${Date.now()}.png`; link.href = dataURL; document.body.appendChild(link); link.click(); document.body.removeChild(link); }); }, 50); }); }

  // 全局背景色一键替换处理函数
  const handleGlobalBgGradientSelect = (gradient: { bottom: string; top: string }) => {
    setGlobalBgGradient(gradient);
  };

  return (
    <div className="flex flex-1 h-full bg-gray-900 overflow-hidden">
        <div className="w-[420px] border-r border-gray-700 p-5 flex flex-col gap-4 overflow-y-auto shrink-0 text-gray-800 h-full z-10" style={{ backgroundColor: '#F0F1F4' }}>
            {/* 一键标准化 */}
            <div className="bg-white p-4 rounded-2xl shadow-md space-y-3" style={{ borderRadius: '12px' }}>
              <h3 className="font-black text-lg pb-2 mb-3" style={{ fontWeight: 900 }}>一键标准化</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-700 font-bold">颜色选择:</span>
                <div className="flex gap-2 flex-1">
                  {GLOBAL_BG_GRADIENT_PRESETS.map((preset) => {
                    const isActive = globalBgGradient.bottom === preset.bottom && globalBgGradient.top === preset.top;
                    return (
                      <div
                        key={preset.name}
                        onClick={() => handleGlobalBgGradientSelect(preset)}
                        title={preset.name}
                        className={`flex-1 rounded-[8px] cursor-pointer border-2 ${
                          isActive ? 'border-blue-500' : 'border-gray-200'
                        }`}
                        style={{ 
                          height: '68px',
                          background: `linear-gradient(to top, ${preset.bottom}, ${preset.top})`
                        }}
                      />
                    );
                  })}
            </div>
            </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-700 font-bold">素材图:</span>
                <label 
                  className="flex-1 px-3 py-1.5 text-xs rounded-[8px] cursor-pointer text-gray-700 text-center transition-all duration-200" 
                  style={{ backgroundColor: '#DBEAFE' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A3CAFF'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                >
                  点击上传
                  <input type="file" accept="image/*" onChange={handleGlobalAssetUpload} className="hidden"/>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-700 font-bold">背景图:</span>
                <label 
                  className="flex-1 px-3 py-1.5 text-xs rounded-[8px] cursor-pointer text-gray-700 text-center transition-all duration-200" 
                  style={{ backgroundColor: '#DBEAFE' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A3CAFF'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                >
                  点击上传
                  <input type="file" accept="image/*" onChange={handleHeaderUpload} className="hidden"/>
                </label>
              </div>
            </div>
            
            {/* 左屏 */}
            <div className="bg-white p-4 rounded-2xl shadow-md space-y-3" style={{ borderRadius: '12px' }}>
              <h3 className="font-black text-lg pb-2 mb-3" style={{ fontWeight: 900 }}>发券会场 (左屏)</h3>
                 <ColorInput label="背景色值:" value={bgColorTop} onChange={(val) => setGlobalBgGradient({ ...globalBgGradient, bottom: val })} />
                 <div className="border-t border-gray-200 my-2"></div>
                 <div className="text-xs font-bold">文字编辑</div>
                 <div>
                   <input 
                     type="text" 
                     className="w-full border text-xs p-1 rounded-[8px]"
                     style={{ backgroundColor: '#F3F3F5' }} 
                     value={subTitle} 
                     onCompositionStart={() => setIsComposingSubTitle(true)}
                     onCompositionEnd={(e) => {
                       setIsComposingSubTitle(false);
                       setSubTitle(e.currentTarget.value.slice(0, LEFT_SUB_LIMIT));
                     }}
                     onChange={e => {
                       const next = e.target.value;
                       setSubTitle(isComposingSubTitle ? next : next.slice(0, LEFT_SUB_LIMIT));
                     }}
                     placeholder="副标题 (最多11字符)"
                     maxLength={11}
                   />
                   <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(subTitle.length, LEFT_SUB_LIMIT)}/{LEFT_SUB_LIMIT}</div>
                 </div>
                 <div>
                   <input 
                     type="text" 
                     className="w-full border text-xs p-1 rounded-[8px]"
                     style={{ backgroundColor: '#F3F3F5' }} 
                    value={mainTitle} 
                    onCompositionStart={() => setIsComposingMainTitle(true)}
                    onCompositionEnd={(e) => {
                      setIsComposingMainTitle(false);
                      setMainTitle(e.currentTarget.value.slice(0, LEFT_MAIN_LIMIT));
                    }}
                     onChange={e => {
                      const next = e.target.value;
                      setMainTitle(isComposingMainTitle ? next : next.slice(0, LEFT_MAIN_LIMIT));
                     }}
                    placeholder="主标题 (最多8字符)"
                    maxLength={8}
                   />
                  <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(mainTitle.length, LEFT_MAIN_LIMIT)}/{LEFT_MAIN_LIMIT}</div>
                 </div>
                 <div className="border-t border-gray-200 my-2"></div>
                 <div className="text-xs font-bold">业务选择</div>
                 <div className="grid grid-cols-2 gap-2">
                   <button
                     onClick={() => handleMaskSelect('dache')}
                     className="px-3 py-1.5 text-xs rounded-[8px] text-gray-700 transition-all duration-200"
                     style={{ backgroundColor: '#DBEAFE' }}
                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A3CAFF'}
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                   >
                     打车
                   </button>
                   <button
                     onClick={() => handleMaskSelect('shunfengche')}
                     className="px-3 py-1.5 text-xs rounded-[8px] text-gray-700 transition-all duration-200"
                     style={{ backgroundColor: '#DBEAFE' }}
                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A3CAFF'}
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                   >
                     顺风车
                   </button>
                   <button
                     onClick={() => handleMaskSelect('OTA')}
                     className="px-3 py-1.5 text-xs rounded-[8px] text-gray-700 transition-all duration-200"
                     style={{ backgroundColor: '#DBEAFE' }}
                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A3CAFF'}
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                   >
                     OTA
                   </button>
                   <button
                     onClick={() => handleMaskSelect('jingwai')}
                     className="px-3 py-1.5 text-xs rounded-[8px] text-gray-700 transition-all duration-200"
                     style={{ backgroundColor: '#DBEAFE' }}
                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A3CAFF'}
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                   >
                     境外打车
                   </button>
            </div>
                <div className="border-t border-gray-200 my-2 pt-2">
                   <div className="text-xs font-bold mb-2">下载操作</div>
                   <div className="flex flex-col gap-2">
                     <button 
                       onClick={() => download('会场全图.png', { left: SCREEN_1_X, top: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT })} 
                       className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full"
                       style={{ fontWeight: 700 }}
                     >
                       下载会场效果图
                     </button>
                     <button 
                       onClick={downloadHeaderArea} 
                       className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full"
                       style={{ fontWeight: 700 }}
                     >
                       下载头图切图x3
                     </button>
            </div>
                </div>
            </div>
            
            {/* 中屏 */}
            <div className="bg-white p-4 rounded-2xl shadow-md space-y-3" style={{ borderRadius: '12px' }}>
              <h3 className="font-black text-lg pb-2 mb-3" style={{ fontWeight: 900 }}>首页Banner (中屏)</h3>
                <div className="text-xs font-bold">文字编辑</div>
                <div>
                  <input 
                    type="text" 
                    className="w-full border text-xs p-1 rounded-[8px]"
                    style={{ backgroundColor: '#F3F3F5' }} 
                    value={bannerMainText} 
                    onCompositionStart={() => setIsComposingBannerMain(true)}
                    onCompositionEnd={(e) => {
                      setIsComposingBannerMain(false);
                      setBannerMainText(e.currentTarget.value.slice(0, BANNER_MAIN_LIMIT));
                    }}
                    onChange={e => {
                      const next = e.target.value;
                      setBannerMainText(isComposingBannerMain ? next : next.slice(0, BANNER_MAIN_LIMIT));
                    }}
                    placeholder="主标题 (最多11字符)"
                    maxLength={11}
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(bannerMainText.length, BANNER_MAIN_LIMIT)}/{BANNER_MAIN_LIMIT}</div>
                </div>
                <div>
                  <input 
                    type="text" 
                    className="w-full border text-xs p-1 rounded-[8px]"
                    style={{ backgroundColor: '#F3F3F5' }} 
                    value={bannerSubText} 
                    onCompositionStart={() => setIsComposingBannerSub(true)}
                    onCompositionEnd={(e) => {
                      setIsComposingBannerSub(false);
                      setBannerSubText(e.currentTarget.value.slice(0, BANNER_SUB_LIMIT));
                    }}
                    onChange={e => {
                      const next = e.target.value;
                      setBannerSubText(isComposingBannerSub ? next : next.slice(0, BANNER_SUB_LIMIT));
                    }}
                    placeholder="副标题 (最多14字符)"
                    maxLength={14}
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(bannerSubText.length, BANNER_SUB_LIMIT)}/{BANNER_SUB_LIMIT}</div>
            </div>
                <div className="flex gap-2 items-center">
                    <input type="text" className="flex-1 border text-xs p-1 rounded-[8px]" style={{ backgroundColor: '#F3F3F5' }} value={bannerTagText} onChange={e => setBannerTagText(e.target.value)} placeholder="暑期大放送"/>
                    <input 
                      type="text" 
                      className="w-20 border text-xs p-1 rounded-[8px]" 
                      style={{ backgroundColor: '#F3F3F5' }} 
                      value={bannerBtnText} 
                      onCompositionStart={() => setIsComposingBannerBtn(true)}
                      onCompositionEnd={(e) => {
                        setIsComposingBannerBtn(false);
                        setBannerBtnText(e.currentTarget.value.slice(0, 3));
                      }}
                      onChange={e => {
                        const next = e.target.value;
                        setBannerBtnText(isComposingBannerBtn ? next : next.slice(0, 3));
                      }}
                      maxLength={3} 
                      placeholder="去领取"
                    />
            </div>
                <div className="border-t border-gray-200 my-2 pt-2">
                   <div className="text-xs font-bold mb-2">下载操作</div>
                   <div className="flex flex-col gap-2">
                     <button 
                       onClick={() => download('中屏整图375x812.png', { left: SCREEN_2_X, top: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT })} 
                       className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full"
                       style={{ fontWeight: 700 }}
                     >
                       下载效果图
                     </button>
                     <button 
                       onClick={() => download('Banner359x104.png', { left: BANNER_OFFSET_X, top: BANNER_OFFSET_Y, width: BANNER_W, height: BANNER_H, multiplier: 1 })} 
                       className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full"
                       style={{ fontWeight: 700 }}
                     >
                       下载banner整图切图x3
                     </button>
                     <button 
                       onClick={downloadBannerCutArea} 
                       className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full"
                       style={{ fontWeight: 700 }}
                     >
                       下载图区切图x3
                     </button>
                   </div>
                </div>
            </div>

            {/* 右屏 */}
            <div className="bg-white p-4 rounded-2xl shadow-md space-y-3" style={{ borderRadius: '12px' }}>
              <h3 className="font-black text-lg pb-2 mb-3" style={{ fontWeight: 900 }}>活动弹窗 (右屏)</h3>
                <div className="text-xs font-bold">文字编辑</div>
                <div>
                  <input 
                    type="text" 
                    className="w-full border text-xs p-1 rounded-[8px]"
                    style={{ backgroundColor: '#F3F3F5' }} 
                    value={popupSubTitle} 
                    onCompositionStart={() => setIsComposingPopupSubTitle(true)}
                    onCompositionEnd={(e) => {
                      setIsComposingPopupSubTitle(false);
                      setPopupSubTitle(e.currentTarget.value.slice(0, 11));
                    }}
                    onChange={e => {
                      const next = e.target.value;
                      setPopupSubTitle(isComposingPopupSubTitle ? next : next.slice(0, 11));
                    }}
                    placeholder="副标 (最多11字符)"
                    maxLength={11}
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(popupSubTitle.length, 11)}/11</div>
                </div>
                <input 
                  type="text" 
                  className="w-full border text-xs p-1 rounded-[8px]" 
                  style={{ backgroundColor: '#F3F3F5' }} 
                  value={popupPriceText} 
                  onCompositionStart={() => setIsComposingPopupPriceText(true)}
                  onCompositionEnd={(e) => {
                    setIsComposingPopupPriceText(false);
                    setPopupPriceText(e.currentTarget.value.slice(0, POPUP_PRICE_LIMIT));
                  }}
                  onChange={e => {
                    const next = e.target.value;
                    setPopupPriceText(isComposingPopupPriceText ? next : next.slice(0, POPUP_PRICE_LIMIT));
                  }}
                  placeholder={`红色大标题 (最多${POPUP_PRICE_LIMIT}字符，数字部分自动DIN-Bold，汉字部分MF FangHei)`}
                  maxLength={POPUP_PRICE_LIMIT}
                />
                <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(popupPriceText.length, POPUP_PRICE_LIMIT)}/{POPUP_PRICE_LIMIT}</div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      className="w-full border text-xs p-1 rounded-[8px]"
                     style={{ backgroundColor: '#F3F3F5' }} 
                      value={popupMainTitle} 
                      onCompositionStart={() => setIsComposingPopupMainTitle(true)}
                      onCompositionEnd={(e) => {
                        setIsComposingPopupMainTitle(false);
                        setPopupMainTitle(e.currentTarget.value.slice(0, 6));
                      }}
                      onChange={e => {
                        const next = e.target.value;
                        setPopupMainTitle(isComposingPopupMainTitle ? next : next.slice(0, 6));
                      }}
                      placeholder="主标 (最多6字符)"
                      maxLength={6}
                    />
                    <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(popupMainTitle.length, 6)}/6</div>
                </div>
                  <div className="flex flex-col">
                    <input type="text" className="w-20 border text-xs p-1 rounded-[8px]" style={{ backgroundColor: '#F3F3F5' }} value={popupBtnText} onChange={e => setPopupBtnText(e.target.value)} placeholder="点击领券"/>
                    <div className="text-[10px] text-gray-400 mt-0.5 opacity-0">0/0</div>
            </div>
            </div>
                <div className="border-t border-gray-200 my-2 pt-2">
                   <div className="text-xs font-bold mb-2">下载操作</div>
                   <div className="flex flex-col gap-2">
                     <button onClick={() => download('弹窗全图375x812.png', { left: SCREEN_3_X, top: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT })} className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full" style={{ fontWeight: 700 }}>下载效果图</button>
                     <button onClick={downloadPopupArea} className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full" style={{ fontWeight: 700 }}>下载切图x3</button>
            </div>
        </div>
            </div>

            {/* 领券弹窗配置 */}
            <div className="bg-white p-4 rounded-2xl shadow-md space-y-3" style={{ borderRadius: '12px' }}>
              <h3 className="font-black text-lg pb-2 mb-3" style={{ fontWeight: 900 }}>领券弹窗 (右2)</h3>
                <div className="text-xs font-bold">文字编辑</div>
                <div>
                  <input 
                    type="text" 
                    className="w-full border text-xs p-1 rounded-[8px]"
                    style={{ backgroundColor: '#F3F3F5' }} 
                    value={ticketSubTitle}
                    onChange={e => {
                      const val = e.target.value;
                      if (!isComposingTicketSubTitle) {
                        setTicketSubTitle(val.slice(0, TICKET_SUBTITLE_LIMIT));
                      } else {
                        setTicketSubTitle(val);
                      }
                    }}
                    onCompositionStart={() => setIsComposingTicketSubTitle(true)}
                    onCompositionEnd={e => {
                      setIsComposingTicketSubTitle(false);
                      const val = e.currentTarget.value;
                      setTicketSubTitle(val.slice(0, TICKET_SUBTITLE_LIMIT));
                    }}
                    placeholder={`副标 (最多${TICKET_SUBTITLE_LIMIT}字符)`}
                    maxLength={TICKET_SUBTITLE_LIMIT}
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(ticketSubTitle.length, TICKET_SUBTITLE_LIMIT)}/{TICKET_SUBTITLE_LIMIT}</div>
                </div>
                <div>
                  <input 
                    type="text" 
                    className="w-full border text-xs p-1 rounded-[8px]"
                    style={{ backgroundColor: '#F3F3F5' }} 
                    value={ticketTitleText}
                    onChange={e => {
                      const val = e.target.value;
                      if (!isComposingTicketTitle) {
                        setTicketTitleText(val.slice(0, TICKET_TITLE_LIMIT));
                      } else {
                        setTicketTitleText(val);
                      }
                    }}
                    onCompositionStart={() => setIsComposingTicketTitle(true)}
                    onCompositionEnd={e => {
                      setIsComposingTicketTitle(false);
                      const val = e.currentTarget.value;
                      setTicketTitleText(val.slice(0, TICKET_TITLE_LIMIT));
                    }}
                    placeholder={`大标题 (最多${TICKET_TITLE_LIMIT}字符，数字部分自动高亮橙#FF5024，DIN 38号字Bold，文字部分MF FangHei 24号字)`}
                    maxLength={TICKET_TITLE_LIMIT}
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(ticketTitleText.length, TICKET_TITLE_LIMIT)}/{TICKET_TITLE_LIMIT}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <input type="text" className="w-20 border text-xs p-1 rounded-[8px]" style={{ backgroundColor: '#F3F3F5' }} value={ticketBtnText} onChange={e => setTicketBtnText(e.target.value)} placeholder="点击领券"/>
                </div>
                <div className="border-t border-gray-200 my-2 pt-2">
                   <div className="text-xs font-bold mb-2">下载操作</div>
                   <div className="flex flex-col gap-2">
                     <button onClick={() => download('领券弹窗全图375x812.png', { left: SCREEN_4_X, top: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT })} className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full" style={{ fontWeight: 700 }}>下载效果图</button>
                     <button onClick={downloadTicketArea} className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full" style={{ fontWeight: 700 }}>下载切图x3</button>
                   </div>
                </div>
            </div>

            {/* AIO 配置 */}
            <div className="bg-white p-4 rounded-2xl shadow-md space-y-3" style={{ borderRadius: '12px' }}>
              <h3 className="font-black text-lg pb-2 mb-3" style={{ fontWeight: 900 }}>AIO分享图 (右3)</h3>
                <div className="text-xs font-bold">文字编辑</div>
                <textarea className="w-full border text-xs p-1 h-12 rounded-[8px]" style={{ backgroundColor: '#F3F3F5' }} value={aioDescText} onChange={e => setAioDescText(e.target.value)} placeholder="描述文案"/>
                <div>
                  <input 
                    type="text" 
                    className="w-full border text-xs p-1 rounded-[8px]"
                    style={{ backgroundColor: '#F3F3F5' }} 
                    value={aioSubTitleTop}
                    onChange={e => {
                      const val = e.target.value;
                      if (!isComposingAioSubTitleTop) {
                        setAioSubTitleTop(val.slice(0, AIO_SUBTITLE_TOP_LIMIT));
                      } else {
                        setAioSubTitleTop(val);
                      }
                    }}
                    onCompositionStart={() => setIsComposingAioSubTitleTop(true)}
                    onCompositionEnd={e => {
                      setIsComposingAioSubTitleTop(false);
                      const val = e.currentTarget.value;
                      setAioSubTitleTop(val.slice(0, AIO_SUBTITLE_TOP_LIMIT));
                    }}
                    placeholder={`顶部副标 (最多${AIO_SUBTITLE_TOP_LIMIT}字符)`}
                    maxLength={AIO_SUBTITLE_TOP_LIMIT}
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(aioSubTitleTop.length, AIO_SUBTITLE_TOP_LIMIT)}/{AIO_SUBTITLE_TOP_LIMIT}</div>
                </div>
                <div>
                  <input 
                    type="text" 
                    className="w-full border text-xs p-1 rounded-[8px]"
                    style={{ backgroundColor: '#F3F3F5' }} 
                    value={aioTitleText}
                    onChange={e => {
                      const val = e.target.value;
                      if (!isComposingAioTitle) {
                        setAioTitleText(val.slice(0, AIO_TITLE_LIMIT));
                      } else {
                        setAioTitleText(val);
                      }
                    }}
                    onCompositionStart={() => setIsComposingAioTitle(true)}
                    onCompositionEnd={e => {
                      setIsComposingAioTitle(false);
                      const val = e.currentTarget.value;
                      setAioTitleText(val.slice(0, AIO_TITLE_LIMIT));
                    }}
                    placeholder={`大标题 (最多${AIO_TITLE_LIMIT}字符，数字部分自动红色高亮，文字部分黑色)`}
                    maxLength={AIO_TITLE_LIMIT}
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(aioTitleText.length, AIO_TITLE_LIMIT)}/{AIO_TITLE_LIMIT}</div>
                </div>
                <div>
                  <input 
                    type="text" 
                    className="w-full border text-xs p-1 rounded-[8px]"
                    style={{ backgroundColor: '#F3F3F5' }} 
                    value={aioSubTitleBottom}
                    onChange={e => {
                      const val = e.target.value;
                      if (!isComposingAioSubTitleBottom) {
                        setAioSubTitleBottom(val.slice(0, AIO_SUBTITLE_BOTTOM_LIMIT));
                      } else {
                        setAioSubTitleBottom(val);
                      }
                    }}
                    onCompositionStart={() => setIsComposingAioSubTitleBottom(true)}
                    onCompositionEnd={e => {
                      setIsComposingAioSubTitleBottom(false);
                      const val = e.currentTarget.value;
                      setAioSubTitleBottom(val.slice(0, AIO_SUBTITLE_BOTTOM_LIMIT));
                    }}
                    placeholder={`底部副标 (最多${AIO_SUBTITLE_BOTTOM_LIMIT}字符)`}
                    maxLength={AIO_SUBTITLE_BOTTOM_LIMIT}
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">{Math.min(aioSubTitleBottom.length, AIO_SUBTITLE_BOTTOM_LIMIT)}/{AIO_SUBTITLE_BOTTOM_LIMIT}</div>
            </div>
                <div className="flex gap-2 items-center">
                  <input type="text" className="w-20 border text-xs p-1 rounded-[8px]" style={{ backgroundColor: '#F3F3F5' }} value={aioBtnText} onChange={e => setAioBtnText(e.target.value)} placeholder="去领取"/>
                </div>
                <div className="border-t border-gray-200 my-2 pt-2">
                   <div className="text-xs font-bold mb-2">下载操作</div>
                   <div className="flex flex-col gap-2">
                     <button onClick={downloadAioFull} className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full" style={{ fontWeight: 700 }}>下载效果图</button>
                     <button onClick={downloadAioCut} className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2.5 rounded-[8px] text-xs w-full" style={{ fontWeight: 700 }}>下载切图x3</button>
                   </div>
                </div>
            </div>
        </div>

        <div className="flex-1 bg-gray-900 overflow-auto flex items-center justify-start p-12">
            <div style={{
                transform: 'scale(0.28)', 
                transformOrigin: 'left center',
                width: TOTAL_WIDTH,
                height: TOTAL_HEIGHT,
                flexShrink: 0
            }} className="shadow-2xl"> 
                 <canvas ref={canvasRef} />
             </div>
        </div>
    </div>
  );
};

export default CanvasEditor;
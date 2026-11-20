// template/src/js/vendor/mathml-to-latex.js
var DOMParser = globalThis.DOMParser ?? globalThis.window?.DOMParser;
var conversionMemo = null;
var setConversionMemo = (memo) => {
  const previous = conversionMemo;
  conversionMemo = memo;
  return previous;
};
var mathMLElementToLaTeXConverter = (mathMLElement) => {
  const precomputed = conversionMemo === null || conversionMemo === void 0 ? void 0 : conversionMemo.get(mathMLElement);
  if (precomputed !== void 0)
    return new PrecomputedConverter(precomputed);
  return new MathMLElementToLatexConverterAdapter(mathMLElement).toLatexConverter();
};
var PrecomputedConverter = class {
  constructor(_latex) {
    this._latex = _latex;
  }
  convert() {
    return this._latex;
  }
};
var normalizeWhiteSpaces = (str) => {
  return str.replace(/\s+/g, " ");
};
var Math$1 = class Math2 {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const unnormalizedLatex = this._mathmlElement.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" ");
    return normalizeWhiteSpaces(unnormalizedLatex);
  }
};
var Wrapper = class {
  constructor(open, close) {
    this._open = open;
    this._close = close;
  }
  /** @returns `str` surrounded by the configured open/close delimiters. */
  wrap(str) {
    return this._open + str + this._close;
  }
};
var BracketWrapper = class {
  constructor() {
    this._open = "{";
    this._close = "}";
  }
  /** @returns `str` wrapped in curly braces. */
  wrap(str) {
    return new Wrapper(this._open, this._close).wrap(str);
  }
};
var ParenthesisWrapper = class {
  constructor() {
    this._open = "\\left(";
    this._close = "\\right)";
  }
  /** @returns `str` wrapped in `\left(`/`\right)`. */
  wrap(str) {
    return new Wrapper(this._open, this._close).wrap(str);
  }
  /** @returns `str` wrapped in parentheses only when it is longer than one char. */
  wrapIfMoreThanOneChar(str) {
    if (str.length <= 1)
      return str;
    return this.wrap(str);
  }
};
var allMathOperatorsByChar = {
  _: "\\underline",
  "&#x23E1;": "\\underbrace",
  "&#x23E0;": "\\overbrace",
  "&#x23DF;": "\\underbrace",
  "&#x23DE;": "\\overbrace",
  "&#x23DD;": "\\underbrace",
  "&#x23DC;": "\\overbrace",
  "&#x23B5;": "\\underbrace",
  "&#x23B4;": "\\overbrace",
  "&#x20DC;": "\\square",
  "&#x20DB;": "\\square",
  "&#x2064;": "",
  "&#x2057;": "''''",
  "&#x203E;": "\\bar",
  "&#x2037;": "```",
  "&#x2036;": "``",
  "&#x2035;": "`",
  "&#x2034;": "'''",
  "&#x2033;": "''",
  "&#x201F;": "``",
  "&#x201E;": ",,",
  "&#x201B;": "`",
  "&#x201A;": ",",
  "&#x302;": "\\hat",
  "&#x2F7;": "\\sim",
  "&#x2DD;": "\\sim",
  "&#x2DC;": "\\sim",
  "&#x2DA;": "\\circ",
  "&#x2D9;": "\\cdot",
  "&#x2D8;": "",
  "&#x2CD;": "\\_",
  "&#x2CB;": "\u02CB",
  "&#x2CA;": "\u02CA",
  "&#x2C9;": "\u02C9",
  "&#x2C7;": "",
  "&#x2C6;": "\\hat",
  "&#xBA;": "o",
  "&#xB9;": "1",
  "&#xB8;": "\xB8",
  "&#xB4;": "\xB4",
  "&#xB3;": "3",
  "&#xB2;": "2",
  "&#xB0;": "\\circ",
  "&#xAF;": "\\bar",
  "&#xAA;": "a",
  "&#xA8;": "\\cdot\\cdot",
  "~": "\\sim",
  "`": "`",
  "^": "\\hat",
  "--": "--",
  "++": "++",
  "&amp;": "\\&",
  "&#x2061;": "",
  "&#x221C;": "\\sqrt[4]{}",
  "&#x221B;": "\\sqrt[3]{}",
  "&#x221A;": "\\sqrt{}",
  "&#x2146;": "d",
  "&#x2145;": "\\mathbb{D}",
  "?": "?",
  "@": "@",
  "//": "//",
  "!!": "!!",
  "!": "!",
  "&#x266F;": "\\#",
  "&#x266E;": "",
  "&#x266D;": "",
  "&#x2032;": "'",
  "&lt;>": "<>",
  "**": "\\star\\star",
  "&#x2207;": "\\nabla",
  "&#x2202;": "\\partial",
  "&#x2299;": "\\bigodot",
  "&#xAC;": "\\neg",
  "&#x2222;": "\\measuredangle",
  "&#x2221;": "\\measuredangle",
  "&#x2220;": "\\angle",
  "&#xF7;": "\\div",
  "/": "/",
  "&#x2216;": "\\backslash",
  "\\": "\\backslash",
  "%": "\\%",
  "&#x2297;": "\\bigotimes",
  "&#xB7;": "\\cdot",
  "&#x2A3F;": "\\coprod",
  "&#x2A2F;": "\\times",
  "&#x22C5;": "\\cdot",
  "&#x22A1;": "\\boxdot",
  "&#x22A0;": "\\boxtimes",
  "&#x2062;": "",
  "&#x2043;": "-",
  "&#x2022;": "\\cdot",
  "&#xD7;": "\\times",
  ".": ".",
  "*": "\\star",
  "&#x222A;": "\\cup",
  "&#x2229;": "\\cap",
  "&#x2210;": "\\coprod",
  "&#x220F;": "\\prod",
  "&#x2240;": "",
  "&#x2AFF;": "",
  "&#x2AFC;": "\\mid\\mid\\mid",
  "&#x2A09;": "\\times",
  "&#x2A08;": "",
  "&#x2A07;": "",
  "&#x2A06;": "\\sqcup",
  "&#x2A05;": "\\sqcap",
  "&#x2A02;": "\\otimes",
  "&#x2A00;": "\\odot",
  "&#x22C2;": "\\cap",
  "&#x22C1;": "\\vee",
  "&#x22C0;": "\\wedge",
  "&#x2A04;": "\\uplus",
  "&#x2A03;": "\\cup",
  "&#x22C3;": "\\cup",
  "&#x2A1C;": "\\underline{\\int}",
  "&#x2A1B;": "\\overline{\\int}",
  "&#x2A1A;": "\\int",
  "&#x2A19;": "\\int",
  "&#x2A18;": "\\int",
  "&#x2A17;": "\\int",
  "&#x2A16;": "\\oint",
  "&#x2A15;": "\\oint",
  "&#x2A14;": "\\int",
  "&#x2A13;": "\\int",
  "&#x2A12;": "\\int",
  "&#x2A11;": "\\int",
  "&#x2A10;": "\\int",
  "&#x2A0F;": "\\bcancel{\\int}",
  "&#x2A0E;": "",
  "&#x2A0D;": "\\hcancel{\\int}",
  "&#x2A0C;": "\\iiiint",
  "&#x2233;": "\\oint",
  "&#x2232;": "\\oint",
  "&#x2231;": "\\int",
  "&#x2230;": "\\oiint",
  "&#x222F;": "\\oiint",
  "&#x222E;": "\\oint",
  "&#x222B;": "\\int",
  "&#x2A01;": "\\oplus",
  "&#x2298;": "\\oslash",
  "&#x2296;": "\\ominus",
  "&#x2295;": "\\oplus",
  "&#x222D;": "\\iiint",
  "&#x222C;": "\\iint",
  "&#x2A0B;": "",
  "&#x2A0A;": "",
  "&#x2211;": "\\sum",
  "&#x229F;": "\\boxminus",
  "&#x229E;": "\\boxplus",
  "&#x2214;": "\\dot{+}",
  "&#x2213;": "+-",
  "&#x2212;": "-",
  "&#xB1;": "\\pm",
  "-": "-",
  "+": "+",
  "&#x2B46;": "\\Rrightarrow",
  "&#x2B45;": "\\Lleftarrow",
  "&#x29F4;": ":\\rightarrow",
  "&#x29EF;": "",
  "&#x29DF;": "\\bullet-\\bullet",
  "&#x299F;": "\\angle",
  "&#x299E;": "\\measuredangle",
  "&#x299D;": "\\measuredangle",
  "&#x299C;": "\\perp",
  "&#x299B;": "\\measuredangle",
  "&#x299A;": "",
  "&#x2999;": "\\vdots",
  "&#x297F;": "",
  "&#x297E;": "",
  "&#x297D;": "\\prec",
  "&#x297C;": "\\succ",
  "&#x297B;": "\\underset{\\rightarrow}{\\supset}",
  "&#x297A;": "",
  "&#x2979;": "\\underset{\\rightarrow}{\\subset}",
  "&#x2978;": "\\underset{\\rightarrow}{>}",
  "&#x2977;": "",
  "&#x2976;": "\\underset{\\leftarrow}{<}",
  "&#x2975;": "\\underset{\\approx}{\\rightarrow}",
  "&#x2974;": "\\underset{\\sim}{\\rightarrow}",
  "&#x2973;": "\\underset{\\sim}{\\leftarrow}",
  "&#x2972;": "\\overset{\\sim}{\\rightarrow}",
  "&#x2971;": "\\overset{=}{\\rightarrow}",
  "&#x2970;": "",
  "&#x296F;": "",
  "&#x296E;": "",
  "&#x296D;": "\\overline{\\rightharpoondown}",
  "&#x296C;": "\\underline{\\rightharpoonup}",
  "&#x296B;": "\\overline{\\leftharpoondown}",
  "&#x296A;": "\\underline{\\leftharpoonup}",
  "&#x2969;": "\\rightleftharpoons",
  "&#x2968;": "\\rightleftharpoons",
  "&#x2967;": "\\rightleftharpoons",
  "&#x2966;": "\\rightleftharpoons",
  "&#x2965;": "\\Downarrow",
  "&#x2964;": "\\Rightarrow",
  "&#x2963;": "\\Uparrow",
  "&#x2962;": "\\Leftarrow",
  "&#x2961;": "\\downarrow",
  "&#x2960;": "\\uparrow",
  "&#x295F;": "\\rightarrow",
  "&#x295E;": "\\leftarrow",
  "&#x295D;": "\\downarrow",
  "&#x295C;": "\\uparrow",
  "&#x295B;": "\\rightarrow",
  "&#x295A;": "\\leftarrow",
  "&#x2959;": "\\downarrow",
  "&#x2958;": "\\uparrow",
  "&#x2957;": "\\rightarrow",
  "&#x2956;": "\\leftarrow",
  "&#x2955;": "\\downarrow",
  "&#x2954;": "\\uparrow",
  "&#x2953;": "\\rightarrow",
  "&#x2952;": "\\leftarrow",
  "&#x2951;": "\\updownarrow",
  "&#x2950;": "\\leftrightarrow",
  "&#x294F;": "\\updownarrow",
  "&#x294E;": "\\leftrightarrow",
  "&#x294D;": "\\updownarrow",
  "&#x294C;": "\\updownarrow",
  "&#x294B;": "\\leftrightarrow",
  "&#x294A;": "\\leftrightarrow",
  "&#x2949;": "",
  "&#x2948;": "\\leftrightarrow",
  "&#x2947;": "\\nrightarrow",
  "&#x2946;": "",
  "&#x2945;": "",
  "&#x2944;": "\\rightleftarrows",
  "&#x2943;": "\\leftrightarrows",
  "&#x2942;": "\\rightleftarrows",
  "&#x2941;": "\\circlearrowright",
  "&#x2940;": "\\circlearrowleft",
  "&#x293F;": "\\rightarrow",
  "&#x293E;": "\\leftarrow",
  "&#x293D;": "",
  "&#x293C;": "",
  "&#x293B;": "",
  "&#x293A;": "",
  "&#x2939;": "",
  "&#x2938;": "",
  "&#x2937;": "\\Rsh",
  "&#x2936;": "\\Lsh",
  "&#x2935;": "\\downarrow",
  "&#x2934;": "\\uparrow",
  "&#x2933;": "\\leadsto",
  "&#x2932;": "",
  "&#x2931;": "",
  "&#x2930;": "",
  "&#x292F;": "",
  "&#x292E;": "",
  "&#x292D;": "",
  "&#x292C;": "\\times",
  "&#x292B;": "\\times",
  "&#x292A;": "",
  "&#x2929;": "",
  "&#x2928;": "",
  "&#x2927;": "",
  "&#x2926;": "",
  "&#x2925;": "",
  "&#x2924;": "",
  "&#x2923;": "",
  "&#x2922;": "",
  "&#x2921;": "",
  "&#x2920;": "\\mapsto\\cdot",
  "&#x291F;": "\\cdot\\leftarrow",
  "&#x291E;": "\\rightarrow\\cdot",
  "&#x291D;": "\\leftarrow",
  "&#x291C;": "\\rightarrow",
  "&#x291B;": "\\leftarrow",
  "&#x291A;": "\\rightarrow",
  "&#x2919;": "\\leftarrow",
  "&#x2918;": "\\rightarrow",
  "&#x2917;": "\\rightarrow",
  "&#x2916;": "\\rightarrow",
  "&#x2915;": "\\rightarrow",
  "&#x2914;": "\\rightarrow",
  "&#x2913;": "\\downarrow",
  "&#x2912;": "\\uparrow",
  "&#x2911;": "\\rightarrow",
  "&#x2910;": "\\rightarrow",
  "&#x290F;": "\\rightarrow",
  "&#x290E;": "\\leftarrow",
  "&#x290D;": "\\rightarrow",
  "&#x290C;": "\\leftarrow",
  "&#x290B;": "\\Downarrow",
  "&#x290A;": "\\Uparrow",
  "&#x2909;": "\\uparrow",
  "&#x2908;": "\\downarrow",
  "&#x2907;": "\\Rightarrow",
  "&#x2906;": "\\Leftarrow",
  "&#x2905;": "\\mapsto",
  "&#x2904;": "\\nLeftrightarrow",
  "&#x2903;": "\\nRightarrow",
  "&#x2902;": "\\nLeftarrow",
  "&#x2901;": "\\rightsquigarrow",
  "&#x2900;": "\\rightsquigarrow",
  "&#x27FF;": "\\rightsquigarrow",
  "&#x27FE;": "\\Rightarrow",
  "&#x27FD;": "\\Leftarrow",
  "&#x27FC;": "\\mapsto",
  "&#x27FB;": "\\leftarrow",
  "&#x27FA;": "\\Longleftrightarrow",
  "&#x27F9;": "\\Longrightarrow",
  "&#x27F8;": "\\Longleftarrow",
  "&#x27F7;": "\\leftrightarrow",
  "&#x27F6;": "\\rightarrow",
  "&#x27F5;": "\\leftarrow",
  "&#x27F1;": "\\Downarrow",
  "&#x27F0;": "\\Uparrow",
  "&#x22B8;": "\\rightarrow",
  "&#x21FF;": "\\leftrightarrow",
  "&#x21FE;": "\\rightarrow",
  "&#x21FD;": "\\leftarrow",
  "&#x21FC;": "\\nleftrightarrow",
  "&#x21FB;": "\\nrightarrow",
  "&#x21FA;": "\\nleftarrow",
  "&#x21F9;": "\\nleftrightarrow",
  "&#x21F8;": "\\nrightarrow",
  "&#x21F7;": "\\nleftarrow",
  "&#x21F6;": "\\Rrightarrow",
  "&#x21F5;": "",
  "&#x21F4;": "\\rightarrow",
  "&#x21F3;": "\\Updownarrow",
  "&#x21F2;": "\\searrow",
  "&#x21F1;": "\\nwarrow",
  "&#x21F0;": "\\Leftarrow",
  "&#x21EF;": "\\Uparrow",
  "&#x21EE;": "\\Uparrow",
  "&#x21ED;": "\\Uparrow",
  "&#x21EC;": "\\Uparrow",
  "&#x21EB;": "\\Uparrow",
  "&#x21EA;": "\\Uparrow",
  "&#x21E9;": "\\Downarrow",
  "&#x21E8;": "\\Rightarrow",
  "&#x21E7;": "\\Uparrow",
  "&#x21E6;": "\\Leftarrow",
  "&#x21E5;": "\\rightarrow",
  "&#x21E4;": "\\leftarrow",
  "&#x21E3;": "\\downarrow",
  "&#x21E2;": "\\rightarrow",
  "&#x21E1;": "\\uparrow",
  "&#x21E0;": "\\leftarrow",
  "&#x21DF;": "\\downarrow",
  "&#x21DE;": "\\uparrow",
  "&#x21DD;": "\\rightsquigarrow",
  "&#x21DC;": "\\leftarrow",
  "&#x21DB;": "\\Rrightarrow",
  "&#x21DA;": "\\Lleftarrow",
  "&#x21D9;": "\\swarrow",
  "&#x21D8;": "\\searrow",
  "&#x21D7;": "\\nearrow",
  "&#x21D6;": "\\nwarrow",
  "&#x21D5;": "\\Updownarrow",
  "&#x21D4;": "\\Leftrightarrow",
  "&#x21D3;": "\\Downarrow",
  "&#x21D2;": "\\Rightarrow",
  "&#x21D1;": "\\Uparrow",
  "&#x21D0;": "\\Leftarrow",
  "&#x21CF;": "\\nRightarrow",
  "&#x21CE;": "\\nLeftrightarrow",
  "&#x21CD;": "\\nLeftarrow",
  "&#x21CC;": "\\rightleftharpoons",
  "&#x21CB;": "\\leftrightharpoons",
  "&#x21CA;": "\\downdownarrows",
  "&#x21C9;": "\\rightrightarrows",
  "&#x21C8;": "\\upuparrows",
  "&#x21C7;": "\\leftleftarrows",
  "&#x21C6;": "\\leftrightarrows",
  "&#x21C5;": "",
  "&#x21C4;": "\\rightleftarrows",
  "&#x21C3;": "\\downharpoonleft",
  "&#x21C2;": "\\downharpoonright",
  "&#x21C1;": "\\rightharpoondown",
  "&#x21C0;": "\\rightharpoonup",
  "&#x21BF;": "\\upharpoonleft",
  "&#x21BE;": "\\upharpoonright",
  "&#x21BD;": "\\leftharpoondown",
  "&#x21BC;": "\\leftharpoonup",
  "&#x21BB;": "\\circlearrowright",
  "&#x21BA;": "\\circlearrowleft",
  "&#x21B9;": "\\leftrightarrows",
  "&#x21B8;": "\\overline{\\nwarrow}",
  "&#x21B7;": "\\curvearrowright",
  "&#x21B6;": "\\curvearrowleft",
  "&#x21B5;": "\\swarrow",
  "&#x21B4;": "\\searrow",
  "&#x21B3;": "\\Rsh",
  "&#x21B2;": "\\Lsh",
  "&#x21B1;": "\\Rsh",
  "&#x21B0;": "\\Lsh",
  "&#x21AF;": "\\swarrow",
  "&#x21AE;": "",
  "&#x21AD;": "\\leftrightsquigarrow",
  "&#x21AC;": "\\looparrowright",
  "&#x21AB;": "\\looparrowleft",
  "&#x21AA;": "\\hookrightarrow",
  "&#x21A9;": "\\hookleftarrow",
  "&#x21A8;": "\\underline{\\updownarrow}",
  "&#x21A7;": "\\downarrow",
  "&#x21A6;": "\\rightarrowtail",
  "&#x21A5;": "\\uparrow",
  "&#x21A4;": "\\leftarrowtail",
  "&#x21A3;": "\\rightarrowtail",
  "&#x21A2;": "\\leftarrowtail",
  "&#x21A1;": "\\downarrow",
  "&#x21A0;": "\\twoheadrightarrow",
  "&#x219F;": "\\uparrow",
  "&#x219E;": "\\twoheadleftarrow",
  "&#x219D;": "\\nearrow",
  "&#x219C;": "\\nwarrow",
  "&#x219B;": "",
  "&#x219A;": "",
  "&#x2199;": "\\swarrow",
  "&#x2198;": "\\searrow",
  "&#x2197;": "\\nearrow",
  "&#x2196;": "\\nwarrow",
  "&#x2195;": "\\updownarrow",
  "&#x2194;": "\\leftrightarrow",
  "&#x2193;": "\\downarrow",
  "&#x2192;": "\\rightarrow",
  "&#x2191;": "\\uparrow",
  "&#x2190;": "\\leftarrow",
  "|||": "\\left|||\\right.",
  "||": "\\left\\|\\right.",
  "|": "\\left|\\right.",
  "&#x2AFE;": "",
  "&#x2AFD;": "//",
  "&#x2AFB;": "///",
  "&#x2AFA;": "",
  "&#x2AF9;": "",
  "&#x2AF8;": "",
  "&#x2AF7;": "",
  "&#x2AF6;": "\\vdots",
  "&#x2AF5;": "",
  "&#x2AF4;": "",
  "&#x2AF3;": "",
  "&#x2AF2;": "\\nparallel",
  "&#x2AF1;": "",
  "&#x2AF0;": "",
  "&#x2AEF;": "",
  "&#x2AEE;": "\\bcancel{\\mid}",
  "&#x2AED;": "",
  "&#x2AEC;": "",
  "&#x2AEB;": "",
  "&#x2AEA;": "",
  "&#x2AE9;": "",
  "&#x2AE8;": "\\underline{\\perp}",
  "&#x2AE7;": "\\overline{\\top}",
  "&#x2AE6;": "",
  "&#x2AE5;": "",
  "&#x2AE4;": "",
  "&#x2AE3;": "",
  "&#x2AE2;": "",
  "&#x2AE1;": "",
  "&#x2AE0;": "\\perp",
  "&#x2ADF;": "\\top",
  "&#x2ADE;": "\\dashv",
  "&#x2ADD;&#x338;": "",
  "&#x2ADD;": "",
  "&#x2ADB;": "\\pitchfork",
  "&#x2ADA;": "",
  "&#x2AD9;": "",
  "&#x2AD8;": "",
  "&#x2AD7;": "",
  "&#x2AD6;": "",
  "&#x2AD5;": "",
  "&#x2AD4;": "",
  "&#x2AD3;": "",
  "&#x2AD2;": "",
  "&#x2AD1;": "",
  "&#x2AD0;": "",
  "&#x2ACF;": "",
  "&#x2ACE;": "",
  "&#x2ACD;": "",
  "&#x2ACC;": "\\underset{\\neq}{\\supset}",
  "&#x2ACB;": "\\underset{\\neq}{\\subset}",
  "&#x2ACA;": "\\underset{\\approx}{\\supset}",
  "&#x2AC9;": "\\underset{\\approx}{\\subset}",
  "&#x2AC8;": "\\underset{\\sim}{\\supset}",
  "&#x2AC7;": "\\underset{\\sim}{\\subset}",
  "&#x2AC6;": "\\supseteqq",
  "&#x2AC5;": "\\subseteqq",
  "&#x2AC4;": "\\dot{\\supseteq}",
  "&#x2AC3;": "\\dot{\\subseteq}",
  "&#x2AC2;": "\\underset{\\times}{\\supset}",
  "&#x2AC1;": "\\underset{\\times}{\\subset}",
  "&#x2AC0;": "\\underset{+}{\\supset}",
  "&#x2ABF;": "\\underset{+}{\\subset}",
  "&#x2ABE;": "",
  "&#x2ABD;": "",
  "&#x2ABC;": "\\gg ",
  "&#x2ABB;": "\\ll",
  "&#x2ABA;": "\\underset{\\cancel{\\approx}}{\\succ}",
  "&#x2AB9;": "\\underset{\\cancel{\\approx}}{\\prec}",
  "&#x2AB8;": "\\underset{\\approx}{\\succ}",
  "&#x2AB7;": "\\underset{\\approx}{\\prec}",
  "&#x2AB6;": "\\underset{\\cancel{=}}{\\succ}",
  "&#x2AB5;": "\\underset{\\cancel{=}}{\\prec}",
  "&#x2AB4;": "\\underset{=}{\\succ}",
  "&#x2AB3;": "\\underset{=}{\\prec}",
  "&#x2AB2;": "",
  "&#x2AB1;": "",
  "&#x2AAE;": "",
  "&#x2AAD;": "\\underline{\\hcancel{>}}",
  "&#x2AAC;": "\\underline{\\hcancel{>}}",
  "&#x2AAB;": "\\hcancel{>}",
  "&#x2AAA;": "\\hcancel{<}",
  "&#x2AA9;": "",
  "&#x2AA8;": "",
  "&#x2AA7;": "\\vartriangleright",
  "&#x2AA6;": "\\vartriangleleft",
  "&#x2AA5;": "><",
  "&#x2AA4;": "><",
  "&#x2AA3;": "\\underline{\\ll}",
  "&#x2AA2;&#x338;": "\\cancel{\\gg}",
  "&#x2AA2;": "\\gg",
  "&#x2AA1;&#x338;": "\\cancel{\\ll}",
  "&#x2AA1;": "\\ll",
  "&#x2AA0;": "\\overset{\\sim}{\\geqq}",
  "&#x2A9F;": "\\overset{\\sim}{\\leqq}",
  "&#x2A9E;": "\\overset{\\sim}{>}",
  "&#x2A9D;": "\\overset{\\sim}{<}",
  "&#x2A9C;": "",
  "&#x2A9B;": "",
  "&#x2A9A;": "\\overset{=}{>}",
  "&#x2A99;": "\\overset{=}{<}",
  "&#x2A98;": "",
  "&#x2A97;": "",
  "&#x2A96;": "",
  "&#x2A95;": "",
  "&#x2A94;": "",
  "&#x2A93;": "",
  "&#x2A92;": "\\underset{=}{\\gtrless}",
  "&#x2A91;": "\\underset{=}{\\lessgtr}",
  "&#x2A90;": "\\underset{<}{\\gtrsim}",
  "&#x2A8F;": "\\underset{>}{\\lesssim}",
  "&#x2A8E;": "\\underset{\\simeq}{>}",
  "&#x2A8D;": "\\underset{\\simeq}{<}",
  "&#x2A8C;": "\\gtreqqless",
  "&#x2A8B;": "\\lesseqqgtr",
  "&#x2A8A;": "\\underset{\\cancel{\\approx}}{>}",
  "&#x2A89;": "\\underset{\\approx}{<}",
  "&#x2A86;": "\\underset{\\approx}{>}",
  "&#x2A85;": "\\underset{\\approx}{<}",
  "&#x2A84;": "",
  "&#x2A83;": "",
  "&#x2A82;": "",
  "&#x2A81;": "",
  "&#x2A80;": "",
  "&#x2A7F;": "",
  "&#x2A7E;&#x338;": "\\bcancel{\\geq}",
  "&#x2A7E;": "\\geq",
  "&#x2A7D;&#x338;": "\\bcancel{\\leq}",
  "&#x2A7D;": "\\leq",
  "&#x2A7C;": "",
  "&#x2A7B;": "",
  "&#x2A7A;": "",
  "&#x2A79;": "",
  "&#x2A78;": "\\overset{\\dots}{\\equiv}",
  "&#x2A77;": "",
  "&#x2A76;": "===",
  "&#x2A75;": "==",
  "&#x2A74;": "::=",
  "&#x2A73;": "",
  "&#x2A72;": "\\underset{=}{+}",
  "&#x2A71;": "\\overset{=}{+}",
  "&#x2A70;": "\\overset{\\approx}{=}",
  "&#x2A6F;": "\\overset{\\wedge}{=}",
  "&#x2A6E;": "\\overset{*}{=}",
  "&#x2A6D;": "\\dot{\\approx}",
  "&#x2A6C;": "",
  "&#x2A6B;": "",
  "&#x2A6A;": "\\dot{\\sim}",
  "&#x2A69;": "",
  "&#x2A68;": "",
  "&#x2A67;": "\\dot{\\equiv}",
  "&#x2A66;": "\\underset{\\cdot}{=}",
  "&#x2A65;": "",
  "&#x2A64;": "",
  "&#x2A63;": "\\underset{=}{\\vee}",
  "&#x2A62;": "\\overset{=}{\\vee}",
  "&#x2A61;": "ul(vv)",
  "&#x2A60;": "\\underset{=}{\\wedge}",
  "&#x2A5F;": "\\underline{\\wedge}",
  "&#x2A5E;": "\\overset{=}{\\wedge}",
  "&#x2A5D;": "\\hcancel{\\vee}",
  "&#x2A5C;": "\\hcancel{\\wedge}",
  "&#x2A5B;": "",
  "&#x2A5A;": "",
  "&#x2A59;": "",
  "&#x2A58;": "\\vee",
  "&#x2A57;": "\\wedge",
  "&#x2A56;": "",
  "&#x2A55;": "",
  "&#x2A54;": "",
  "&#x2A53;": "",
  "&#x2A52;": "\\dot{\\vee}",
  "&#x2A51;": "\\dot{\\wedge}",
  "&#x2A50;": "",
  "&#x2A4F;": "",
  "&#x2A4E;": "",
  "&#x2A4D;": "\\overline{\\cap}",
  "&#x2A4C;": "\\overline{\\cup}",
  "&#x2A4B;": "",
  "&#x2A4A;": "",
  "&#x2A49;": "",
  "&#x2A48;": "",
  "&#x2A47;": "",
  "&#x2A46;": "",
  "&#x2A45;": "",
  "&#x2A44;": "",
  "&#x2A43;": "\\overline{\\cap}",
  "&#x2A42;": "\\overline{\\cup}",
  "&#x2A41;": "",
  "&#x2A40;": "",
  "&#x2A3E;": "",
  "&#x2A3D;": "\\llcorner",
  "&#x2A3C;": "\\lrcorner",
  "&#x2A3B;": "",
  "&#x2A3A;": "",
  "&#x2A39;": "",
  "&#x2A38;": "",
  "&#x2A37;": "",
  "&#x2A36;": "\\hat{\\otimes}",
  "&#x2A35;": "",
  "&#x2A34;": "",
  "&#x2A33;": "",
  "&#x2A32;": "\\underline{\\times}",
  "&#x2A31;": "\\underline{\\times}",
  "&#x2A30;": "\\dot{\\times}",
  "&#x2A2E;": "",
  "&#x2A2D;": "",
  "&#x2A2C;": "",
  "&#x2A2B;": "",
  "&#x2A2A;": "",
  "&#x2A29;": "",
  "&#x2A28;": "",
  "&#x2A27;": "",
  "&#x2A26;": "\\underset{\\sim}{+}",
  "&#x2A25;": "\\underset{\\circ}{+}",
  "&#x2A24;": "\\overset{\\sim}{+}",
  "&#x2A23;": "\\hat{+}",
  "&#x2A22;": "\\dot{+}",
  "&#x2A21;": "\\upharpoonright",
  "&#x2A20;": ">>",
  "&#x2A1F;": "",
  "&#x2A1E;": "\\triangleleft",
  "&#x2A1D;": "\\bowtie",
  "&#x29FF;": "",
  "&#x29FE;": "+",
  "&#x29FB;": "\\hcancel{|||}",
  "&#x29FA;": "\\hcancel{||}",
  "&#x29F9;": "\\backslash",
  "&#x29F8;": "/",
  "&#x29F7;": "hcancel{\backslash}",
  "&#x29F6;": "",
  "&#x29F5;": "\\backslash",
  "&#x29F2;": "\\Phi",
  "&#x29F1;": "",
  "&#x29F0;": "",
  "&#x29EE;": "",
  "&#x29ED;": "",
  "&#x29EC;": "",
  "&#x29EB;": "\\lozenge",
  "&#x29EA;": "",
  "&#x29E9;": "",
  "&#x29E8;": "",
  "&#x29E7;": "\\ddagger",
  "&#x29E2;": "\\sqcup\\sqcup",
  "&#x29E1;": "",
  "&#x29E0;": "\\square",
  "&#x29DE;": "",
  "&#x29DD;": "",
  "&#x29DC;": "",
  "&#x29DB;": "\\{\\{",
  "&#x29D9;": "\\{",
  "&#x29D8;": "\\}",
  "&#x29D7;": "",
  "&#x29D6;": "",
  "&#x29D5;": "\\bowtie",
  "&#x29D4;": "\\bowtie",
  "&#x29D3;": "\\bowtie",
  "&#x29D2;": "\\bowtie",
  "&#x29D1;": "\\bowtie",
  "&#x29D0;&#x338;": "| \\not\\triangleright",
  "&#x29D0;": "| \\triangleright",
  "&#x29CF;&#x338;": "\\not\\triangleleft |",
  "&#x29CF;": "\\triangleleft |",
  "&#x29CE;": "",
  "&#x29CD;": "\\triangle",
  "&#x29CC;": "",
  "&#x29CB;": "\\underline{\\triangle}",
  "&#x29CA;": "\\dot{\\triangle}",
  "&#x29C9;": "",
  "&#x29C8;": "\\boxed{\\circ}",
  "&#x29C7;": "\\boxed{\\circ}",
  "&#x29C6;": "\\boxed{\\rightarrow}",
  "&#x29C5;": "\\bcancel{\\square}",
  "&#x29C4;": "\\cancel{\\square}",
  "&#x29C3;": "\\odot",
  "&#x29C2;": "\\odot",
  "&#x29BF;": "\\odot",
  "&#x29BE;": "\\odot",
  "&#x29BD;": "\\varnothing",
  "&#x29BC;": "\\oplus",
  "&#x29BB;": "\\otimes",
  "&#x29BA;": "",
  "&#x29B9;": "\\varnothing",
  "&#x29B8;": "\\varnothing",
  "&#x29B7;": "\\ominus",
  "&#x29B6;": "\\ominus",
  "&#x29B5;": "\\ominus",
  "&#x29B4;": "\\vec{\\varnothing}",
  "&#x29B3;": "\\vec{\\varnothing}",
  "&#x29B2;": "\\dot{\\varnothing}",
  "&#x29B1;": "\\overline{\\varnothing}",
  "&#x29B0;": "\\varnothing",
  "&#x29AF;": "",
  "&#x29AE;": "",
  "&#x29AD;": "",
  "&#x29AC;": "",
  "&#x29AB;": "",
  "&#x29AA;": "",
  "&#x29A9;": "",
  "&#x29A8;": "",
  "&#x29A7;": "",
  "&#x29A6;": "",
  "&#x29A5;": "",
  "&#x29A4;": "",
  "&#x29A3;": "",
  "&#x29A2;": "",
  "&#x29A1;": "\\not\\lor",
  "&#x29A0;": "\\bcancel{>}",
  "&#x2982;": ":",
  "&#x2981;": "\\circ",
  "&#x2758;": "|",
  "&#x25B2;": "\\bigtriangleup",
  "&#x22FF;": "\\Epsilon",
  "&#x22FE;": "\\overline{\\ni}",
  "&#x22FD;": "\\overline{\\ni}",
  "&#x22FC;": "\\in",
  "&#x22FB;": "\\in",
  "&#x22FA;": "\\in",
  "&#x22F9;": "\\underline{\\in}",
  "&#x22F8;": "\\underline{\\in}",
  "&#x22F7;": "\\overline{\\in}",
  "&#x22F6;": "\\overline{\\in}",
  "&#x22F5;": "\\dot{\\in}",
  "&#x22F4;": "\\in",
  "&#x22F3;": "\\in",
  "&#x22F2;": "\\in",
  "&#x22F0;": "\\ddots",
  "&#x22E9;": "\\underset{\\sim}{\\succ}",
  "&#x22E8;": "\\underset{\\sim}{\\prec}",
  "&#x22E7;": "\\underset{\\not\\sim}{>}",
  "&#x22E6;": "\\underset{\\not\\sim}{<}",
  "&#x22E5;": "\\not\\sqsupseteq",
  "&#x22E4;": "\\not\\sqsubseteq",
  "&#x22E3;": "\\not\\sqsupseteq",
  "&#x22E2;": "\\not\\sqsubseteq",
  "&#x22E1;": "\\nsucc",
  "&#x22E0;": "\\nprec",
  "&#x22DF;": "\\succ",
  "&#x22DE;": "\\prec",
  "&#x22DD;": "\\overline{>}",
  "&#x22DC;": "\\overline{<}",
  "&#x22DB;": "\\underset{>}{\\leq}",
  "&#x22DA;": "\\underset{<}{\\geq}",
  "&#x22D5;": "\\#",
  "&#x22D3;": "\\cup",
  "&#x22D2;": "\\cap",
  "&#x22D1;": "\\supset",
  "&#x22D0;": "\\subset",
  "&#x22CF;": "\\wedge",
  "&#x22CE;": "\\vee",
  "&#x22CD;": "\\simeq",
  "&#x22C8;": "\\bowtie",
  "&#x22C7;": "\\ast",
  "&#x22C6;": "\\star",
  "&#x22C4;": "\\diamond",
  "&#x22BF;": "\\triangle",
  "&#x22BE;": "\\measuredangle",
  "&#x22BD;": "\\overline{\\lor}",
  "&#x22BC;": "\\overline{\\land}",
  "&#x22BB;": "\\underline{\\lor}",
  "&#x22BA;": "\\top",
  "&#x22B9;": "",
  "&#x22B7;": "\\circ\\multimap",
  "&#x22B6;": "\\circ\\multimap",
  "&#x22B3;": "\\triangleright",
  "&#x22B2;": "\\triangleleft",
  "&#x22B1;": "\\succ",
  "&#x22B0;": "\\prec",
  "&#x22AB;": "|\\models",
  "&#x22AA;": "|\\models",
  "&#x22A7;": "\\models",
  "&#x22A6;": "\\vdash",
  "&#x229D;": "\\ominus",
  "&#x229C;": "\\ominus",
  "&#x229B;": "\\odot",
  "&#x229A;": "\\odot",
  "&#x2294;": "\\sqcup",
  "&#x2293;": "\\sqcap",
  "&#x2292;": "\\sqsupseteq",
  "&#x2291;": "\\sqsubseteq",
  "&#x2290;&#x338;": "\\not\\sqsupset",
  "&#x2290;": "\\sqsupset",
  "&#x228F;&#x338;": "\\not\\sqsubset",
  "&#x228F;": "\\sqsubset",
  "&#x228E;": "\\cup",
  "&#x228D;": "\\cup",
  "&#x228C;": "\\cup",
  "&#x227F;&#x338;": "\\not\\succsim",
  "&#x227F;": "\\succsim",
  "&#x227E;": "\\precsim",
  "&#x2279;": "\\not\\overset{>}{<}",
  "&#x2278;": "\\not\\overset{>}{<}",
  "&#x2277;": "\\overset{>}{<}",
  "&#x2276;": "\\overset{<}{>}",
  "&#x2275;": "\\not\\geg",
  "&#x2274;": "\\not\\leq",
  "&#x2273;": "\\geg",
  "&#x2272;": "\\leq",
  "&#x226C;": "",
  "&#x2267;": "\\geg",
  "&#x2266;&#x338;": "\\not\\leq",
  "&#x2266;": "\\leq",
  "&#x2263;": "\\overset{=}{=} ",
  "&#x225E;": "\\overset{m}{=} ",
  "&#x225D;": "\\overset{def}{=}",
  "&#x2258;": "=",
  "&#x2256;": "=",
  "&#x2255;": "=:",
  "&#x2253;": "\\doteq",
  "&#x2252;": "\\doteq",
  "&#x2251;": "\\doteq",
  "&#x2250;": "\\doteq",
  "&#x224F;&#x338;": "",
  "&#x224F;": "",
  "&#x224E;&#x338;": "",
  "&#x224E;": "",
  "&#x224C;": "\\approx",
  "&#x224B;": "\\approx",
  "&#x224A;": "\\approx",
  "&#x2242;&#x338;": "\\neq",
  "&#x2242;": "=",
  "&#x223F;": "\\sim",
  "&#x223E;": "\\infty",
  "&#x223D;&#x331;": "\\sim",
  "&#x223D;": "\\sim",
  "&#x223B;": "\\sim",
  "&#x223A;": ":-:",
  "&#x2239;": "-:",
  "&#x2238;": "\\bot",
  "&#x2237;": "::",
  "&#x2236;": ":",
  "&#x2223;": "|",
  "&#x221F;": "\\llcorner",
  "&#x2219;": "\\cdot",
  "&#x2218;": "\\circ",
  "&#x2217;": "*",
  "&#x2215;": "/",
  "&#x220E;": "\\square",
  "&#x220D;": "\\ni",
  "&#x220A;": "\\in",
  "&#x2206;": "\\Delta",
  "&#x2044;": "/",
  "&#x2AB0;&#x338;": "\\nsucceq",
  "&#x2AB0;": "\\succeq",
  "&#x2AAF;&#x338;": "\\npreceq",
  "&#x2AAF;": "\\preceq",
  "&#x2A88;": "\\ngeqslant",
  "&#x2A87;": "\\nleqslant",
  "&#x29F3;": "\\Phi",
  "&#x29E6;": "\\models",
  "&#x29E5;": "\\not\\equiv",
  "&#x29E4;": "\\approx\\neq",
  "&#x29E3;": "\\neq",
  "&#x29C1;": "\\circle",
  "&#x29C0;": "\\circle",
  "&#x25E6;": "\\circle",
  "&#x25D7;": "\\circle",
  "&#x25D6;": "\\circle",
  "&#x25CF;": "\\circle",
  "&#x25CE;": "\\circledcirc",
  "&#x25CD;": "\\circledcirc",
  "&#x25CC;": "\\circledcirc",
  "&#x25C9;": "\\circledcirc",
  "&#x25C8;": "\\diamond",
  "&#x25C7;": "\\diamond",
  "&#x25C6;": "\\diamond",
  "&#x25C5;": "\\triangleleft",
  "&#x25C4;": "\\triangleleft",
  "&#x25C3;": "\\triangleleft",
  "&#x25C2;": "\\triangleleft",
  "&#x25C1;": "\\triangleleft",
  "&#x25C0;": "\\triangleleft",
  "&#x25BF;": "\\triangledown",
  "&#x25BE;": "\\triangledown",
  "&#x25BD;": "\\triangledown",
  "&#x25BC;": "\\triangledown",
  "&#x25B9;": "\\triangleright",
  "&#x25B8;": "\\triangleright",
  "&#x25B7;": "\\triangleright",
  "&#x25B6;": "\\triangleright",
  "&#x25B5;": "\\triangle",
  "&#x25B4;": "\\triangle",
  "&#x25B3;": "\\triangle",
  "&#x25B1;": "\\square",
  "&#x25B0;": "\\square",
  "&#x25AF;": "\\square",
  "&#x25AE;": "\\square",
  "&#x25AD;": "\\square",
  "&#x25AB;": "\\square",
  "&#x25AA;": "\\square",
  "&#x25A1;": "\\square",
  "&#x25A0;": "\\square",
  "&#x22ED;": "\\not\\triangleright",
  "&#x22EC;": "\\not\\triangleleft",
  "&#x22EB;": "\\not\\triangleright",
  "&#x22EA;": "\\not\\triangleleft",
  "&#x22D9;": "\\ggg",
  "&#x22D8;": "\\lll",
  "&#x22D7;": "*>",
  "&#x22D6;": "<*",
  "&#x22D4;": "\\pitchfork",
  "&#x22CC;": "",
  "&#x22CB;": "",
  "&#x22CA;": "\\rtimes",
  "&#x22C9;": "\\ltimes",
  "&#x22B5;": "\\triangleright",
  "&#x22B4;": "",
  "&#x22A5;": "\\bot",
  "&#x2281;": "\\nsucc",
  "&#x2280;": "\\preceq",
  "&#x227D;": "\\succeq",
  "&#x227C;": "\\preceq",
  "&#x227B;": "\\succ",
  "&#x227A;": "\\prec",
  "&#x2271;": "\\geq/",
  "&#x2270;": "\\leq/",
  "&#x226D;": "\\neq",
  "&#x226B;&#x338;": "\\not\\gg",
  "&#x226B;": "\\gg",
  "&#x226A;&#x338;": "\\not\\ll",
  "&#x226A;": "\\ll",
  "&#x2269;": "\\ngeqslant",
  "&#x2268;": "\\nleqslant",
  "&#x2261;": "\\equiv",
  "&#x225F;": "\\doteq",
  "&#x225C;": "\\triangleq",
  "&#x225B;": "\\doteq",
  "&#x225A;": "\\triangleq",
  "&#x2259;": "\\triangleq",
  "&#x2257;": "\\doteq",
  "&#x2254;": ":=",
  "&#x224D;": "\\asymp",
  "&#x2247;": "\\ncong",
  "&#x2246;": "\\ncong",
  "&#x2245;": "\\cong",
  "&#x2244;": "\\not\\simeq",
  "&#x2243;": "\\simeq",
  "&#x2241;": "\\not\\sim",
  "&#x2226;": "\\not\\parallel",
  "&#x2225;": "\\parallel",
  "&#x2224;": "\\not|",
  "&#x221D;": "\\propto",
  "==": "==",
  "=": "=",
  ":=": ":=",
  "/=": "=",
  "-=": "-=",
  "+=": "+=",
  "*=": "*=",
  "!=": "!=",
  "&#x2260;": "\\neq",
  "&#x2262;": "\\equiv /",
  "&#x2249;": "\\approx /",
  "&#x223C;": "sim",
  "&#x2248;": "\\approx",
  "&#x226E;": "</",
  "&lt;": "<",
  "&#x226F;": ">/",
  ">=": ">=",
  ">": ">",
  "&#x2265;": "\\geq",
  "&#x2264;": "\\leq",
  "&lt;=": "<=",
  "&#x228B;": "\\supsetneq",
  "&#x228A;": "\\subsetneq",
  "&#x2289;": "\\nsupseteq",
  "&#x2288;": "\\nsubseteq",
  "&#x2287;": "\\supseteq",
  "&#x2286;": "\\subseteq",
  "&#x2285;": "\\not\\supset",
  "&#x2284;": "\\not\\subset",
  "&#x2283;&#x20D2;": "\\supset |",
  "&#x2283;": "\\supset",
  "&#x2282;&#x20D2;": "\\subset |",
  "&#x2282;": "\\subset",
  "&#x220C;": "\\not\\in",
  "&#x2209;": "\\notin",
  "&#x2208;": "\\in",
  "&#x2201;": "C",
  "&#x2204;": "\\nexists",
  "&#x2203;": "\\exists",
  "&#x2200;": "\\forall",
  "&#x2227;": "\\land",
  "&amp;&amp;": "\\&\\&",
  "&#x2228;": "\\lor",
  "&#x22AF;": "\\cancel{\\vDash}",
  "&#x22AE;": "\\cancel{\\Vdash}",
  "&#x22AD;": "\\nvDash",
  "&#x22AC;": "\\nvDash",
  "&#x22A9;": "\\Vdash",
  "&#x22A8;": "\\vDash",
  "&#x22A4;": "\\top",
  "&#x22A3;": "\\dashv",
  "&#x22A2;": "\\vdash",
  "&#x220B;": "\\ni",
  "&#x22F1;": "\\ddots",
  "&#x22EF;": "\\hdots",
  "&#x22EE;": "\\vdots",
  "&#x2026;": "\\hdots",
  "&#x3F6;": "\\ni",
  ":": ":",
  "...": "\\cdots",
  "..": "..",
  "->": "->",
  "&#x2235;": "\\because",
  "&#x2234;": "\\therefore ",
  "&#x2063;": "",
  ",": ",",
  ";": ";",
  "&#x29FD;": "\\}",
  "&#x29FC;": "\\{",
  "&#x2998;": "\\]",
  "&#x2997;": "\\[",
  "&#x2996;": "\\ll",
  "&#x2995;": "\\gg",
  "&#x2994;": "\\gg",
  "&#x2993;": "\\ll",
  "&#x2992;": "\\gg",
  "&#x2991;": "\\ll",
  "&#x2990;": "\\]",
  "&#x298F;": "\\]",
  "&#x298E;": "\\]",
  "&#x298D;": "\\[",
  "&#x298C;": "\\[",
  "&#x298B;": "\\]",
  "&#x298A;": "\\triangleright",
  "&#x2989;": "\\triangleleft",
  "&#x2988;": "|\\)",
  "&#x2987;": "\\(|",
  "&#x2986;": "|\\)",
  "&#x2985;": "\\(\\(",
  "&#x2984;": "|\\}",
  "&#x2983;": "\\{|",
  "&#x2980;": "\\||",
  "&#x27EF;": "\\left. \\right]",
  "&#x27EE;": "\\left[ \\right.",
  "&#x27ED;": "\\left. \\right]]",
  "&#x27EC;": "\\left[[ \\right.",
  "&#x27EB;": "\\gg",
  "&#x27EA;": "\\ll",
  "&#x27E9;": "\\rangle",
  "&#x27E8;": "\\langle",
  "&#x27E7;": "\\left. \\right]]",
  "&#x27E6;": "\\left[[ \\right.",
  "&#x2773;": "\\left.\\right)",
  "&#x2772;": "\\left(\\right.",
  "&#x232A;": "\\rangle",
  "&#x2329;": "\\langle",
  "&#x230B;": "\\rfloor",
  "&#x230A;": "\\lfloor",
  "&#x2309;": "\\rceil",
  "&#x2308;": "\\lceil",
  "&#x2016;": "\\parallel",
  "}": "\\left.\\right\\}",
  "{": "\\left\\{\\right.",
  "]": "\\left]\\right.",
  "[": "\\left[\\right.",
  ")": "\\left.\\right)",
  "(": "\\left(\\right.",
  "&#x201D;": '"',
  "&#x201C;": "``",
  "&#x2019;": "'",
  "&#x2018;": "`",
  "%CE%B1": "\\alpha",
  "%CE%B2": "\\beta",
  "%CE%B3": "\\gamma",
  "%CE%93": "\\Gamma",
  "%CE%B4": "\\delta",
  "%CE%94": "\\Delta",
  "%CF%B5": "\\epsilon",
  "%CE%B6": "\\zeta",
  "%CE%B7": "\\eta",
  "%CE%B8": "\\theta",
  "%CE%98": "\\Theta",
  "%CE%B9": "\\iota",
  "%CE%BA": "\\kappa",
  "%CE%BB": "\\lambda",
  "%CE%BC": "\\mu",
  "%CE%BD": "\\nu",
  "%CE%BF": "\\omicron",
  "%CF%80": "\\pi",
  "%CE%A0": "\\Pi",
  "%CF%81": "\\pho",
  "%CF%83": "\\sigma",
  "%CE%A3": "\\Sigma",
  "%CF%84": "\\tau",
  "%CF%85": "\\upsilon",
  "%CE%A5": "\\Upsilon",
  "%CF%95": "\\phi",
  "%CE%A6": "\\Phi",
  "%CF%87": "\\chi",
  "%CF%88": "\\psi",
  "%CE%A8": "\\Psi",
  "%CF%89": "\\omega",
  "%CE%A9": "\\Omega"
};
var allMathOperatorsByGlyph = {
  _: "\\underline",
  "\u23E1": "\\underbrace",
  "\u23E0": "\\overbrace",
  "\u23DF": "\\underbrace",
  "\u23DE": "\\overbrace",
  "\u23DD": "\\underbrace",
  "\u23DC": "\\overbrace",
  "\u23B5": "\\underbrace",
  "\u23B4": "\\overbrace",
  "\u20DC": "\\square",
  "\u20DB": "\\square",
  "\u2064": "",
  "\u2057": "''''",
  "\u203E": "\\overline",
  "\u2037": "```",
  "\u2036": "``",
  "\u2035": "`",
  "\u2034": "'''",
  "\u2033": "''",
  "\u201F": "``",
  "\u201E": ",,",
  "\u201B": "`",
  "\u201A": ",",
  "^": "\\hat",
  "\u02F7": "\\sim",
  "\u02DD": "\\sim",
  "\u02DC": "\\sim",
  "\u02DA": "\\circ",
  "\u02D9": "\\cdot",
  "\u02D8": " ",
  "\u02CD": "\\_",
  "\u02CB": "\u02CB",
  "\u02CA": "\u02CA",
  "\u02C9": "\u02C9",
  "\u02C7": "",
  "\u02C6": "\\hat",
  \u00BA: "o",
  "\xB9": "1",
  "\xB8": ",",
  "\xB4": "\xB4",
  "\xB3": "3",
  "\xB2": "2",
  "\xB0": "\\circ",
  "\xAF": "\\bar",
  \u00AA: "a",
  "\u219B": "\\nrightarrow",
  "\xA8": "\\cdot\\cdot",
  "~": "\\sim",
  "`": "`",
  "--": "--",
  "++": "++",
  "&": "\\&",
  "\u221C": "\\sqrt[4]{}",
  "\u221B": "\\sqrt[3]{}",
  "\u221A": "\\sqrt{}",
  "\u2146": "d",
  "\u2145": "\\mathbb{D}",
  "?": "?",
  "@": "@",
  "//": "//",
  "!!": "!!",
  "!": "!",
  "\u266F": "\\#",
  "\u266E": "",
  "\u266D": "",
  "\u2032": "'",
  "<>": "<>",
  "**": "\\star\\star",
  "\u2207": "\\nabla",
  "\u2202": "\\partial",
  "\u2299": "\\bigodot",
  "\xAC": "\\neg",
  "\u2222": "\\measuredangle",
  "\u2221": "\\measuredangle",
  "\u2220": "\\angle",
  "\xF7": "\\div",
  "/": "/",
  "\u2216": "\\backslash",
  "\\": "\\backslash",
  "%": "\\%",
  "\u2297": "\\bigotimes",
  "\xB7": "\\cdot",
  "\u2A3F": "\\coprod",
  "\u2A2F": "\\times",
  "\u22C5": "\\cdot",
  "\u22A1": "\\boxdot",
  "\u22A0": "\\boxtimes",
  "\u2062": "",
  "\u2061": "",
  "\u2043": "-",
  "\u2022": "\\cdot",
  ".": ".",
  "*": "\\star",
  "\u222A": "\\cup",
  "\u2229": "\\cap",
  "\u2210": "\\coprod",
  "\u220F": "\\prod",
  "\u2240": "",
  "\u2AFF": "",
  "\u2AFC": "\\mid\\mid\\mid",
  "\u2A09": "\\times",
  "\u2A08": "",
  "\u2A07": "",
  "\u2A06": "\\sqcup",
  "\u2A05": "\\sqcap",
  "\u2A02": "\\otimes",
  "\u2A00": "\\odot",
  "\u22C2": "\\cap",
  "\u22C1": "\\vee",
  "\u22C0": "\\wedge",
  "\u2A04": "\\uplus",
  "\u2A03": "\\cup",
  "\u22C3": "\\cup",
  "\u2A1C": "\\underline{\\int}",
  "\u2A1B": "\\overline{\\int}",
  "\u2A1A": "\\int",
  "\u2A19": "\\int",
  "\u2A18": "\\int",
  "\u2A17": "\\int",
  "\u2A16": "\\oint",
  "\u2A15": "\\oint",
  "\u2A14": "\\int",
  "\u2A13": "\\int",
  "\u2A12": "\\int",
  "\u2A11": "\\int",
  "\u2A10": "\\int",
  "\u2A0F": "\\bcancel{\\int}",
  "\u2A0E": "",
  "\u2A0D": "\\hcancel{\\int}",
  "\u2A0C": "\\iiiint",
  "\u2233": "\\oint",
  "\u2232": "\\oint",
  "\u2231": "\\int",
  "\u2230": "\\oiint",
  "\u222F": "\\oiint",
  "\u222E": "\\oint",
  "\u222B": "\\int",
  "\u2A01": "\\oplus",
  "\u2298": "\\oslash",
  "\u2296": "\\ominus",
  "\u2295": "\\oplus",
  "\u222D": "\\iiint",
  "\u222C": "\\iint",
  "\u2A0B": "",
  "\u2A0A": "",
  "\u2211": "\\sum",
  "\u229F": "\\boxminus",
  "\u229E": "\\boxplus",
  "\u2214": "\\dot{+}",
  "\u2213": "+-",
  "\u2212": "-",
  "\xB1": "\\pm",
  "-": "-",
  "+": "+",
  "\u2B46": "\\Rrightarrow",
  "\u2B45": "\\Lleftarrow",
  "\u29F4": ":\\rightarrow",
  "\u29EF": "",
  "\u29DF": "\\bullet-\\bullet",
  "\u299F": "\\angle",
  "\u299E": "\\measuredangle",
  "\u299D": "\\measuredangle",
  "\u299C": "\\perp",
  "\u299B": "\\measuredangle",
  "\u299A": "",
  "\u2999": "\\vdots",
  "\u297F": "",
  "\u297E": "",
  "\u297D": "\\prec",
  "\u297C": "\\succ",
  "\u297B": "\\underset{\\rightarrow}{\\supset}",
  "\u297A": "",
  "\u2979": "\\underset{\\rightarrow}{\\subset}",
  "\u2978": "\\underset{\\rightarrow}{>}",
  "\u2977": "",
  "\u2976": "\\underset{\\leftarrow}{<}",
  "\u2975": "\\underset{\\approx}{\\rightarrow}",
  "\u2974": "\\underset{\\sim}{\\rightarrow}",
  "\u2973": "\\underset{\\sim}{\\leftarrow}",
  "\u2972": "\\overset{\\sim}{\\rightarrow}",
  "\u2971": "\\overset{=}{\\rightarrow}",
  "\u2970": "",
  "\u296F": "",
  "\u296E": "",
  "\u296D": "\\overline{\\rightharpoondown}",
  "\u296C": "\\underline{\\rightharpoonup}",
  "\u296B": "\\overline{\\leftharpoondown}",
  "\u296A": "\\underline{\\leftharpoonup}",
  "\u2969": "\\rightleftharpoons",
  "\u2968": "\\rightleftharpoons",
  "\u2967": "\\rightleftharpoons",
  "\u2966": "\\rightleftharpoons",
  "\u2965": "\\Downarrow",
  "\u2964": "\\Rightarrow",
  "\u2963": "\\Uparrow",
  "\u2962": "\\Leftarrow",
  "\u2961": "\\downarrow",
  "\u2960": "\\uparrow",
  "\u295F": "\\rightarrow",
  "\u295E": "\\leftarrow",
  "\u295D": "\\downarrow",
  "\u295C": "\\uparrow",
  "\u295B": "\\rightarrow",
  "\u295A": "\\leftarrow",
  "\u2959": "\\downarrow",
  "\u2958": "\\uparrow",
  "\u2957": "\\rightarrow",
  "\u2956": "\\leftarrow",
  "\u2955": "\\downarrow",
  "\u2954": "\\uparrow",
  "\u2953": "\\rightarrow",
  "\u2952": "\\leftarrow",
  "\u2951": "\\updownarrow",
  "\u2950": "\\leftrightarrow",
  "\u294F": "\\updownarrow",
  "\u294E": "\\leftrightarrow",
  "\u294D": "\\updownarrow",
  "\u294C": "\\updownarrow",
  "\u294B": "\\leftrightarrow",
  "\u294A": "\\leftrightarrow",
  "\u2949": "",
  "\u2948": "\\leftrightarrow",
  "\u2947": "\\nrightarrow",
  "\u2946": "",
  "\u2945": "",
  "\u2944": "\\rightleftarrows",
  "\u2943": "\\leftrightarrows",
  "\u2942": "\\rightleftarrows",
  "\u2941": "\\circlearrowright",
  "\u2940": "\\circlearrowleft",
  "\u293F": "\\rightarrow",
  "\u293E": "\\leftarrow",
  "\u293D": "\\leftarrow",
  "\u293C": "\\rightarrow",
  "\u293B": "\\rightarrow",
  "\u293A": "\\leftarrow",
  "\u2939": "\\downarrow",
  "\u2938": "\\downarrow",
  "\u2937": "\\Rsh",
  "\u2936": "\\Lsh",
  "\u2935": "\\downarrow",
  "\u2934": "\\uparrow",
  "\u2933": "\\rightarrow",
  "\u2932": "\\leftarrow",
  "\u2931": " ",
  "\u2930": " ",
  "\u292F": " ",
  "\u292E": " ",
  "\u292D": " ",
  "\u292C": "\\times",
  "\u292B": "\\times",
  "\u292A": " ",
  "\u2929": " ",
  "\u2928": " ",
  "\u2927": " ",
  "\u2926": " ",
  "\u2925": " ",
  "\u2924": " ",
  "\u2923": " ",
  "\u2922": " ",
  "\u2921": " ",
  "\u2920": "\\mapsto\\cdot",
  "\u291F": "\\cdot\\leftarrow",
  "\u291E": "\\rightarrow\\cdot",
  "\u291D": "\\leftarrow",
  "\u291C": "\\rightarrow",
  "\u291B": "\\leftarrow",
  "\u291A": "\\rightarrow",
  "\u2919": "\\leftarrow",
  "\u2918": "\\rightarrow",
  "\u2917": "\\rightarrow",
  "\u2916": "\\rightarrow",
  "\u2915": "\\rightarrow",
  "\u2914": "\\rightarrow",
  "\u2913": "\\downarrow",
  "\u2912": "\\uparrow",
  "\u2911": "\\rightarrow",
  "\u2910": "\\rightarrow",
  "\u290F": "\\rightarrow",
  "\u290E": "\\leftarrow",
  "\u290D": "\\rightarrow",
  "\u290C": "\\leftarrow",
  "\u290B": "\\Downarrow",
  "\u290A": "\\Uparrow",
  "\u2909": "\\uparrow",
  "\u2908": "\\downarrow",
  "\u2907": "\\Rightarrow",
  "\u2906": "\\Leftarrow",
  "\u2905": "\\mapsto",
  "\u2904": "\\nLeftrightarrow",
  "\u2903": "\\nRightarrow",
  "\u2902": "\\nLeftarrow",
  "\u2901": "\\rightsquigarrow",
  "\u2900": "\\rightsquigarrow",
  "\u27FF": "\\rightsquigarrow",
  "\u27FE": "\\Rightarrow",
  "\u27FD": "\\Leftarrow",
  "\u27FC": "\\mapsto",
  "\u27FB": "\\leftarrow",
  "\u27FA": "\\Longleftrightarrow",
  "\u27F9": "\\Longrightarrow",
  "\u27F8": "\\Longleftarrow",
  "\u27F7": "\\leftrightarrow",
  "\u27F6": "\\rightarrow",
  "\u27F5": "\\leftarrow",
  "\u27F1": "\\Downarrow",
  "\u27F0": "\\Uparrow",
  "\u22B8": "\\rightarrow",
  "\u21FF": "\\leftrightarrow",
  "\u21FE": "\\rightarrow",
  "\u21FD": "\\leftarrow",
  "\u21FC": "\\nleftrightarrow",
  "\u21FB": "\\nrightarrow",
  "\u21FA": "\\nleftarrow",
  "\u21F9": "\\nleftrightarrow",
  "\u21F8": "\\nrightarrow",
  "\u21F7": "\\nleftarrow",
  "\u21F6": "\\Rrightarrow",
  "\u21F5": "",
  "\u21F4": "\\rightarrow",
  "\u21F3": "\\Updownarrow",
  "\u21F2": "\\searrow",
  "\u21F1": "\\nwarrow",
  "\u21F0": "\\Leftarrow",
  "\u21EF": "\\Uparrow",
  "\u21EE": "\\Uparrow",
  "\u21ED": "\\Uparrow",
  "\u21EC": "\\Uparrow",
  "\u21EB": "\\Uparrow",
  "\u21EA": "\\Uparrow",
  "\u21E9": "\\Downarrow",
  "\u21E8": "\\Rightarrow",
  "\u21E7": "\\Uparrow",
  "\u21E6": "\\Leftarrow",
  "\u21E5": "\\rightarrow",
  "\u21E4": "\\leftarrow",
  "\u21E3": "\\downarrow",
  "\u21E2": "\\rightarrow",
  "\u21E1": "\\uparrow",
  "\u21E0": "\\leftarrow",
  "\u21DF": "\\downarrow",
  "\u21DE": "\\uparrow",
  "\u21DD": "\\rightsquigarrow",
  "\u21DC": "\\leftarrow",
  "\u21DB": "\\Rrightarrow",
  "\u21DA": "\\Lleftarrow",
  "\u21D9": "\\swarrow",
  "\u21D8": "\\searrow",
  "\u21D7": "\\nearrow",
  "\u21D6": "\\nwarrow",
  "\u21D5": "\\Updownarrow",
  "\u21D4": "\\Leftrightarrow",
  "\u21D3": "\\Downarrow",
  "\u21D2": "\\Rightarrow",
  "\u21D1": "\\Uparrow",
  "\u21D0": "\\Leftarrow",
  "\u21CF": "\\nRightarrow",
  "\u21CE": "\\nLeftrightarrow",
  "\u21CD": "\\nLeftarrow",
  "\u21CC": "\\rightleftharpoons",
  "\u21CB": "\\leftrightharpoons",
  "\u21CA": "\\downdownarrows",
  "\u21C9": "\\rightrightarrows",
  "\u21C8": "\\upuparrows",
  "\u21C7": "\\leftleftarrows",
  "\u21C6": "\\leftrightarrows",
  "\u21C5": "",
  "\u21C4": "\\rightleftarrows",
  "\u21C3": "\\downharpoonleft",
  "\u21C2": "\\downharpoonright",
  "\u21C1": "\\rightharpoondown",
  "\u21C0": "\\rightharpoonup",
  "\u21BF": "\\upharpoonleft",
  "\u21BE": "\\upharpoonright",
  "\u21BD": "\\leftharpoondown",
  "\u21BC": "\\leftharpoonup",
  "\u21BB": "\\circlearrowright",
  "\u21BA": "\\circlearrowleft",
  "\u21B9": "\\leftrightarrows",
  "\u21B8": "\\overline{\\nwarrow}",
  "\u21B7": "\\curvearrowright",
  "\u21B6": "\\curvearrowleft",
  "\u21B5": "\\swarrow",
  "\u21B4": "\\searrow",
  "\u21B3": "\\Rsh",
  "\u21B2": "\\Lsh",
  "\u21B1": "\\Rsh",
  "\u21B0": "\\Lsh",
  "\u21AF": "\\swarrow",
  "\u21AE": "",
  "\u21AD": "\\leftrightsquigarrow",
  "\u21AC": "\\looparrowright",
  "\u21AB": "\\looparrowleft",
  "\u21AA": "\\hookrightarrow",
  "\u21A9": "\\hookleftarrow",
  "\u21A8": "\\underline{\\updownarrow}",
  "\u21A7": "\\downarrow",
  "\u21A6": "\\mapsto",
  "\u21A5": "\\uparrow",
  "\u21A4": "\\leftarrowtail",
  "\u21A3": "\\rightarrowtail",
  "\u21A2": "\\leftarrowtail",
  "\u21A1": "\\downarrow",
  "\u21A0": "\\twoheadrightarrow",
  "\u219F": "\\uparrow",
  "\u219E": "\\twoheadleftarrow",
  "\u219D": "\\nearrow",
  "\u219C": "\\nwarrow",
  "\u219A": "",
  "\u2199": "\\swarrow",
  "\u2198": "\\searrow",
  "\u2197": "\\nearrow",
  "\u2196": "\\nwarrow",
  "\u2195": "\\updownarrow",
  "\u2194": "\\leftrightarrow",
  "\u2193": "\\downarrow",
  "\u2192": "\\rightarrow",
  "\u2191": "\\uparrow",
  "\u2190": "\\leftarrow",
  "|||": "\\left|||\\right.",
  "||": "\\left\\|\\right.",
  "|": "\\mid",
  "\u2AFE": "",
  "\u2AFD": "//",
  "\u2AFB": "///",
  "\u2AFA": "",
  "\u2AF9": "",
  "\u2AF8": "",
  "\u2AF7": "",
  "\u2AF6": "\\vdots",
  "\u2AF5": "",
  "\u2AF4": "",
  "\u2AF3": "",
  "\u2AF2": "\\nparallel",
  "\u2AF1": "",
  "\u2AF0": "",
  "\u2AEF": "",
  "\u2AEE": "\\bcancel{\\mid}",
  "\u2AED": "",
  "\u2AEC": "",
  "\u2AEB": "",
  "\u2AEA": "",
  "\u2AE9": "",
  "\u2AE8": "\\underline{\\perp}",
  "\u2AE7": "\\overline{\\top}",
  "\u2AE6": "",
  "\u2AE5": "",
  "\u2AE4": "",
  "\u2AE3": "",
  "\u2AE2": "",
  "\u2AE1": "",
  "\u2AE0": "\\perp",
  "\u2ADF": "\\top",
  "\u2ADE": "\\dashv",
  "\u2ADD\u0338": "",
  "\u2ADD": "",
  "\u2ADB": "\\pitchfork",
  "\u2ADA": "",
  "\u2AD9": "",
  "\u2AD8": "",
  "\u2AD7": "",
  "\u2AD6": "",
  "\u2AD5": "",
  "\u2AD4": "",
  "\u2AD3": "",
  "\u2AD2": "",
  "\u2AD1": "",
  "\u2AD0": "",
  "\u2ACF": "",
  "\u2ACE": "",
  "\u2ACD": "",
  "\u2ACC": "\\underset{\\neq}{\\supset}",
  "\u2ACB": "\\underset{\\neq}{\\subset}",
  "\u2ACA": "\\underset{\\approx}{\\supset}",
  "\u2AC9": "\\underset{\\approx}{\\subset}",
  "\u2AC8": "\\underset{\\sim}{\\supset}",
  "\u2AC7": "\\underset{\\sim}{\\subset}",
  "\u2AC6": "\\supseteqq",
  "\u2AC5": "\\subseteqq",
  "\u2AC4": "\\dot{\\supseteq}",
  "\u2AC3": "\\dot{\\subseteq}",
  "\u2AC2": "\\underset{\\times}{\\supset}",
  "\u2AC1": "\\underset{\\times}{\\subset}",
  "\u2AC0": "\\underset{+}{\\supset}",
  "\u2ABF": "\\underset{+}{\\subset}",
  "\u2ABE": "",
  "\u2ABD": "",
  "\u2ABC": "\\gg ",
  "\u2ABB": "\\ll",
  "\u2ABA": "\\underset{\\cancel{\\approx}}{\\succ}",
  "\u2AB9": "\\underset{\\cancel{\\approx}}{\\prec}",
  "\u2AB8": "\\underset{\\approx}{\\succ}",
  "\u2AB7": "\\underset{\\approx}{\\prec}",
  "\u2AB6": "\\underset{\\cancel{=}}{\\succ}",
  "\u2AB5": "\\underset{\\cancel{=}}{\\prec}",
  "\u2AB4": "\\underset{=}{\\succ}",
  "\u2AB3": "\\underset{=}{\\prec}",
  "\u2AB2": "",
  "\u2AB1": "",
  "\u2AAE": "",
  "\u2AAD": "\\underline{\\hcancel{>}}",
  "\u2AAC": "\\underline{\\hcancel{>}}",
  "\u2AAB": "\\hcancel{>}",
  "\u2AAA": "\\hcancel{<}",
  "\u2AA9": "",
  "\u2AA8": "",
  "\u2AA7": "\\vartriangleright",
  "\u2AA6": "\\vartriangleleft",
  "\u2AA5": "><",
  "\u2AA4": "><",
  "\u2AA3": "\\underline{\\ll}",
  "\u2AA2\u0338": "\\cancel{\\gg}",
  "\u2AA2": "\\gg",
  "\u2AA1\u0338": "\\cancel{\\ll}",
  "\u2AA1": "\\ll",
  "\u2AA0": "\\overset{\\sim}{\\geqq}",
  "\u2A9F": "\\overset{\\sim}{\\leqq}",
  "\u2A9E": "\\overset{\\sim}{>}",
  "\u2A9D": "\\overset{\\sim}{<}",
  "\u2A9C": "",
  "\u2A9B": "",
  "\u2A9A": "\\overset{=}{>}",
  "\u2A99": "\\overset{=}{<}",
  "\u2A98": "",
  "\u2A97": "",
  "\u2A96": "",
  "\u2A95": "",
  "\u2A94": "",
  "\u2A93": "",
  "\u2A92": "\\underset{=}{\\gtrless}",
  "\u2A91": "\\underset{=}{\\lessgtr}",
  "\u2A90": "\\underset{<}{\\gtrsim}",
  "\u2A8F": "\\underset{>}{\\lesssim}",
  "\u2A8E": "\\underset{\\simeq}{>}",
  "\u2A8D": "\\underset{\\simeq}{<}",
  "\u2A8C": "\\gtreqqless",
  "\u2A8B": "\\lesseqqgtr",
  "\u2A8A": "\\underset{\\cancel{\\approx}}{>}",
  "\u2A89": "\\underset{\\approx}{<}",
  "\u2A86": "\\underset{\\approx}{>}",
  "\u2A85": "\\underset{\\approx}{<}",
  "\u2A84": "",
  "\u2A83": "",
  "\u2A82": "",
  "\u2A81": "",
  "\u2A80": "",
  "\u2A7F": "",
  "\u2A7E\u0338": "\\bcancel{\\geq}",
  "\u2A7E": "\\geq",
  "\u2A7D\u0338": "\\bcancel{\\leq}",
  "\u2A7D": "\\leq",
  "\u2A7C": "",
  "\u2A7B": "",
  "\u2A7A": "",
  "\u2A79": "",
  "\u2A78": "\\overset{\\dots}{\\equiv}",
  "\u2A77": "",
  "\u2A76": "===",
  "\u2A75": "==",
  "\u2A74": "::=",
  "\u2A73": "",
  "\u2A72": "\\underset{=}{+}",
  "\u2A71": "\\overset{=}{+}",
  "\u2A70": "\\overset{\\approx}{=}",
  "\u2A6F": "\\overset{\\wedge}{=}",
  "\u2A6E": "\\overset{*}{=}",
  "\u2A6D": "\\dot{\\approx}",
  "\u2A6C": "",
  "\u2A6B": "",
  "\u2A6A": "\\dot{\\sim}",
  "\u2A69": "",
  "\u2A68": "",
  "\u2A67": "\\dot{\\equiv}",
  "\u2A66": "\\underset{\\cdot}{=}",
  "\u2A65": "",
  "\u2A64": "",
  "\u2A63": "\\underset{=}{\\vee}",
  "\u2A62": "\\overset{=}{\\vee}",
  "\u2A61": "ul(vv)",
  "\u2A60": "\\underset{=}{\\wedge}",
  "\u2A5F": "\\underline{\\wedge}",
  "\u2A5E": "\\overset{=}{\\wedge}",
  "\u2A5D": "\\hcancel{\\vee}",
  "\u2A5C": "\\hcancel{\\wedge}",
  "\u2A5B": "",
  "\u2A5A": "",
  "\u2A59": "",
  "\u2A58": "\\vee",
  "\u2A57": "\\wedge",
  "\u2A56": "",
  "\u2A55": "",
  "\u2A54": "",
  "\u2A53": "",
  "\u2A52": "\\dot{\\vee}",
  "\u2A51": "\\dot{\\wedge}",
  "\u2A50": "",
  "\u2A4F": "",
  "\u2A4E": "",
  "\u2A4D": "\\overline{\\cap}",
  "\u2A4C": "\\overline{\\cup}",
  "\u2A4B": "",
  "\u2A4A": "",
  "\u2A49": "",
  "\u2A48": "",
  "\u2A47": "",
  "\u2A46": "",
  "\u2A45": "",
  "\u2A44": "",
  "\u2A43": "\\overline{\\cap}",
  "\u2A42": "\\overline{\\cup}",
  "\u2A41": "",
  "\u2A40": "",
  "\u2A3E": "",
  "\u2A3D": "\\llcorner",
  "\u2A3C": "\\lrcorner",
  "\u2A3B": "",
  "\u2A3A": "",
  "\u2A39": "",
  "\u2A38": "",
  "\u2A37": "",
  "\u2A36": "\\hat{\\otimes}",
  "\u2A35": "",
  "\u2A34": "",
  "\u2A33": "",
  "\u2A32": "\\underline{\\times}",
  "\u2A31": "\\underline{\\times}",
  "\u2A30": "\\dot{\\times}",
  "\u2A2E": "\\bigodot",
  "\u2A2D": "\\bigodot",
  "\u2A2C": "",
  "\u2A2B": "",
  "\u2A2A": "",
  "\u2A29": "",
  "\u2A28": "",
  "\u2A27": "",
  "\u25FB": "\\Box",
  "\u2A26": "\\underset{\\sim}{+}",
  "\u2A25": "\\underset{\\circ}{+}",
  "\u2A24": "\\overset{\\sim}{+}",
  "\u2A23": "\\hat{+}",
  "\u2A22": "\\dot{+}",
  "\u2A21": "\\upharpoonright",
  "\u2A20": ">>",
  "\u2A1F": "",
  "\u2A1E": "\\triangleleft",
  "\u2A1D": "\\bowtie",
  "\u29FF": "",
  "\u29FE": "+",
  "\u29FB": "\\hcancel{|||}",
  "\u29FA": "\\hcancel{||}",
  "\u29F9": "\\backslash",
  "\u29F8": "/",
  "\u29F7": "hcancel{\backslash}",
  "\u29F6": "",
  "\u29F5": "\\backslash",
  "\u29F2": "\\Phi",
  "\u29F1": "",
  "\u29F0": "",
  "\u29EE": "",
  "\u29ED": "",
  "\u29EC": "",
  "\u29EB": "\\lozenge",
  "\u29EA": "",
  "\u29E9": "",
  "\u29E8": "",
  "\u29E7": "\\ddagger",
  "\u29E2": "\\sqcup\\sqcup",
  "\u29E1": "",
  "\u29E0": "\\square",
  "\u29DE": "",
  "\u29DD": "",
  "\u29DC": "",
  "\u29DB": "\\{\\{",
  "\u29D9": "\\{",
  "\u29D8": "\\}",
  "\u29D7": "",
  "\u29D6": "",
  "\u29D5": "\\bowtie",
  "\u29D4": "\\bowtie",
  "\u29D3": "\\bowtie",
  "\u29D2": "\\bowtie",
  "\u29D1": "\\bowtie",
  "\u29D0\u0338": "| \\not\\triangleright",
  "\u29D0": "| \\triangleright",
  "\u29CF\u0338": "\\not\\triangleleft |",
  "\u29CF": "\\triangleleft |",
  "\u29CE": "",
  "\u29CD": "\\triangle",
  "\u29CC": "",
  "\u29CB": "\\underline{\\triangle}",
  "\u29CA": "\\dot{\\triangle}",
  "\u29C9": "",
  "\u29C8": "\\boxed{\\circ}",
  "\u29C7": "\\boxed{\\circ}",
  "\u29C6": "\\boxed{\\rightarrow}",
  "\u29C5": "\\bcancel{\\square}",
  "\u29C4": "\\cancel{\\square}",
  "\u29C3": "\\odot",
  "\u29C2": "\\odot",
  "\u29BF": "\\odot",
  "\u29BE": "\\odot",
  "\u29BD": "\\varnothing",
  "\u29BC": "\\oplus",
  "\u29BB": "\\otimes",
  "\u29BA": "",
  "\u29B9": "\\varnothing",
  "\u29B8": "\\varnothing",
  "\u29B7": "\\ominus",
  "\u29B6": "\\ominus",
  "\u29B5": "\\ominus",
  "\u29B4": "\\vec{\\varnothing}",
  "\u29B3": "\\vec{\\varnothing}",
  "\u29B2": "\\dot{\\varnothing}",
  "\u29B1": "\\overline{\\varnothing}",
  "\u29B0": "\\varnothing",
  "\u29AF": "\\measuredangle",
  "\u29AE": "\\measuredangle",
  "\u29AD": "\\measuredangle",
  "\u29AC": "\\measuredangle",
  "\u29AB": "\\measuredangle",
  "\u29AA": "\\measuredangle",
  "\u29A9": "\\measuredangle",
  "\u29A8": "\\measuredangle",
  "\u29A7": "",
  "\u29A6": "",
  "\u29A5": "",
  "\u29A4": "",
  "\u29A3": "\\ulcorner",
  "\u29A2": "\\measuredangle",
  "\u29A1": "\\not\\lor",
  "\u29A0": "\\bcancel{>}",
  "\u2982": ":",
  "\u2981": "\\cdot",
  "\u2758": "\\mid",
  "\u25B2": "\\bigtriangleup",
  "\u22FF": "\\Epsilon",
  "\u22FE": "\\overline{\\ni}",
  "\u22FD": "\\overline{\\ni}",
  "\u22FC": "\\in",
  "\u22FB": "\\in",
  "\u22FA": "\\in",
  "\u22F9": "\\underline{\\in}",
  "\u22F8": "\\underline{\\in}",
  "\u22F7": "\\overline{\\in}",
  "\u22F6": "\\overline{\\in}",
  "\u22F5": "\\dot{\\in}",
  "\u22F4": "\\in",
  "\u22F3": "\\in",
  "\u22F2": "\\in",
  "\u22F0": "\\ddots",
  "\u0589": ":",
  "\u22E9": "\\underset{\\sim}{\\succ}",
  "\u22E8": "\\underset{\\sim}{\\prec}",
  "\u22E7": "\\underset{\\not\\sim}{>}",
  "\u22E6": "\\underset{\\not\\sim}{<}",
  "\u22E5": "\\not\\sqsupseteq",
  "\u22E4": "\\not\\sqsubseteq",
  "\u22E3": "\\not\\sqsupseteq",
  "\u22E2": "\\not\\sqsubseteq",
  "\u22E1": "\\nsucc",
  "\u22E0": "\\nprec",
  "\u22DF": "\\succ",
  "\u22DE": "\\prec",
  "\u22DD": "\\overline{>}",
  "\u22DC": "\\overline{<}",
  "\u22DB": "\\underset{>}{\\leq}",
  "\u22DA": "\\underset{<}{\\geq}",
  "\u22D5": "\\#",
  "\u22D3": "\\cup",
  "\u22D2": "\\cap",
  "\u22D1": "\\supset",
  "\u22D0": "\\subset",
  "\u22CF": "\\wedge",
  "\u22CE": "\\vee",
  "\u22CD": "\\simeq",
  "\u22C8": "\\Join",
  "\u22C7": "\\ast",
  "\u22C6": "\\star",
  "\u22C4": "\\diamond",
  "\u22BF": "\\triangle",
  "\u22BE": "\\measuredangle",
  "\u22BD": "\\overline{\\lor}",
  "\u22BC": "\\overline{\\land}",
  "\u22BB": "\\underline{\\lor}",
  "\u22BA": "\\top",
  \u571F: "\\pm",
  \u5341: "+",
  "\u22B9": "",
  "\u22B7": "\\circ\\multimap",
  "\u22B6": "\\circ\\multimap",
  "\u22B3": "\\triangleright",
  "\u22B2": "\\triangleleft",
  "\u22B1": "\\succ",
  "\u22B0": "\\prec",
  "\u22AB": "|\\models",
  "\u22AA": "|\\models",
  "\u22A7": "\\models",
  "\u22A6": "\\vdash",
  "\u229D": "\\ominus",
  "\u229C": "\\ominus",
  "\u229B": "\\odot",
  "\u229A": "\\odot",
  "\u2294": "\\sqcup",
  "\u2293": "\\sqcap",
  "\u2292": "\\sqsupseteq",
  "\u2291": "\\sqsubseteq",
  "\u2290\u0338": "\\not\\sqsupset",
  "\u2290": "\\sqsupset",
  "\u228F\u0338": "\\not\\sqsubset",
  "\u228F": "\\sqsubset",
  "\u228E": "\\cup",
  "\u228D": "\\cup",
  "\u228C": "\\cup",
  "\u227F\u0338": "\\not\\succsim",
  "\u227F": "\\succsim",
  "\u227E": "\\precsim",
  "\u2279": "\\not\\overset{>}{<}",
  "\u2278": "\\not\\overset{>}{<}",
  "\u2277": "\\overset{>}{<}",
  "\u2276": "\\overset{<}{>}",
  "\u2275": "\\not\\geg",
  "\u2274": "\\not\\leq",
  "\u2273": "\\geg",
  "\u2272": "\\leq",
  "\u226C": "",
  "\u2267": "\\geqq",
  "\u2266\u0338": "\\not\\leq",
  "\u2266": "\\leq",
  "\u2263": "\\overset{=}{=} ",
  "\u225E": "\\overset{m}{=} ",
  "\u225D": "\\overset{def}{=}",
  "\u2258": "=",
  "\u2256": "=",
  "\u2255": "=:",
  "\u2253": "\\doteq",
  "\u2252": "\\doteq",
  "\u2251": "\\doteq",
  "\u2250": "\\doteq",
  "\u224F\u0338": "",
  "\u224F": "",
  "\u224E\u0338": "",
  "\u224E": "",
  "\u224C": "\\approx",
  "\u224B": "\\approx",
  "\u224A": "\\approx",
  "\u2242\u0338": "\\neq",
  "\u2242": "=",
  "\u223F": "\\sim",
  "\u223E": "\\infty",
  "\u223D\u0331": "\\sim",
  "\u223D": "\\sim",
  "\u223B": "\\sim",
  "\u223A": ":-:",
  "\u2239": "-:",
  "\u2238": "\\bot",
  "\u2237": "::",
  "\u2236": ":",
  "\u2223": "\\mid",
  "\u221F": "\\llcorner",
  "\u2218": "\\circ",
  "\u2217": "*",
  "\u2215": "/",
  "\u220E": "\\square",
  "\u220D": "\\ni",
  "\u220A": "\\in",
  "\u2206": "\\Delta",
  "\u2044": "/",
  "\u2AB0\u0338": "\\nsucceq",
  "\u2AB0": "\\succeq",
  "\u2AAF\u0338": "\\npreceq",
  "\u2AAF": "\\preceq",
  "\u2A88": "\\ngeqslant",
  "\u2A87": "\\nleqslant",
  "\u29F3": "\\Phi",
  "\u29E6": "\\models",
  "\u29E5": "\\not\\equiv",
  "\u29E4": "\\approx\\neq",
  "\u29E3": "\\neq",
  "\u29C1": "\\circle",
  "\u29C0": "\\circle",
  "\u25E6": "\\circle",
  "\u25D7": "\\circle",
  "\u25D6": "\\circle",
  "\u25CF": "\\circle",
  "\u25CE": "\\circledcirc",
  "\u25CD": "\\circledcirc",
  "\u25CC": "\\circledcirc",
  "\u25C9": "\\circledcirc",
  "\u25C8": "\\diamond",
  "\u25C7": "\\diamond",
  "\u25C6": "\\diamond",
  "\u25C5": "\\triangleleft",
  "\u25C4": "\\triangleleft",
  "\u25C3": "\\triangleleft",
  "\u25C2": "\\triangleleft",
  "\u25C1": "\\triangleleft",
  "\u25C0": "\\triangleleft",
  "\u25BF": "\\triangledown",
  "\u25BE": "\\triangledown",
  "\u25BD": "\\triangledown",
  "\u25BC": "\\triangledown",
  "\u25B9": "\\triangleright",
  "\u25B8": "\\triangleright",
  "\u25B7": "\\triangleright",
  "\u25B6": "\\triangleright",
  "\u25B5": "\\triangle",
  "\u25B4": "\\triangle",
  "\u25B3": "\\triangle",
  "\u25B1": "\\square",
  "\u25B0": "\\blacksquare",
  "\u25AF": "\\square",
  "\u25AE": "\\blacksquare",
  "\u25AD": "\\square",
  "\u25AB": "\\square",
  "\u25AA": "\\square",
  "\u25A1": "\\square",
  "\u25A0": "\\blacksquare",
  "\u22ED": "\\not\\triangleright",
  "\u22EC": "\\not\\triangleleft",
  "\u22EB": "\\not\\triangleright",
  "\u22EA": "\\not\\triangleleft",
  "\u22D9": "\\ggg",
  "\u22D8": "\\lll",
  "\u22D7": "*>",
  "\u22D6": "<*",
  "\u22D4": "\\pitchfork",
  "\u22CC": "",
  "\u22CB": "\\bowtie",
  "\u22CA": "\\ltimes",
  "\u22C9": "\\rtimes",
  "\u22B5": "\\triangleright",
  "\\triangleleft": "",
  "\u22A5": "\\bot",
  "\u2281": "\\nsucc",
  "\u2280": "\\preceq",
  "\u227D": "\\succeq",
  "\u227C": "\\preceq",
  "\u227B": "\\succ",
  "\u227A": "\\prec",
  "\u2271": "\\geq/",
  "\u2270": "\\leq/",
  "\u226D": "\\neq",
  "\u226B\u0338": "\\not\\gg",
  "\u226B": "\\gg",
  "\u226A\u0338": "\\not\\ll",
  "\u226A": "\\ll",
  "\u2269": "\\ngeqslant",
  "\u2268": "\\nleqslant",
  "\u2261": "\\equiv",
  "\u225F": "\\doteq",
  "\u225C": "\\triangleq",
  "\u225B": "\\doteq",
  "\u225A": "\\triangleq",
  "\u2259": "\\triangleq",
  "\u2257": "\\doteq",
  "\u2254": ":=",
  "\u224D": "\\asymp",
  "\u2247": "\\ncong",
  "\u2246": "\\ncong",
  "\u2245": "\\cong",
  "\u2244": "\\not\\simeq",
  "\u2243": "\\simeq",
  "\u2241": "\\not\\sim",
  "\u2226": "\\not\\parallel",
  "\u2225": "\\parallel",
  "\u2224": "\\not|",
  "\u221D": "\\propto",
  "==": "==",
  "=": "=",
  ":=": ":=",
  "/=": "=",
  "-=": "-=",
  "+=": "+=",
  "*=": "*=",
  "!=": "!=",
  "\u2260": "\\neq",
  "\u2262": "\\equiv /",
  "\u2249": "\\approx /",
  "\u223C": "\\sim",
  "\u2248": "\\approx",
  "\u226E": "</",
  "<": "<",
  "\u226F": ">/",
  ">=": ">=",
  ">": ">",
  "\u2265": "\\geq",
  "\u2264": "\\leq",
  "<=": "<=",
  "\u228B": "\\supsetneq",
  "\u228A": "\\subsetneq",
  "\u2289": "\\nsupseteq",
  "\u2288": "\\nsubseteq",
  "\u2287": "\\supseteq",
  "\u2286": "\\subseteq",
  "\u2285": "\\not\\supset",
  "\u2284": "\\not\\subset",
  "\u2283\u20D2": "\\supset |",
  "\u2283": "\\supset",
  "\u2282\u20D2": "\\subset |",
  "\u2282": "\\subset",
  "\u220C": "\\not\\in",
  "\u2209": "\\notin",
  "\u2208": "\\in",
  "\u2201": "C",
  "\u2204": "\\nexists",
  "\u2203": "\\exists",
  "\u2200": "\\forall",
  "\u2227": "\\land",
  "&&": "\\&\\&",
  "\u2228": "\\lor",
  "\u22AF": "\\cancel{\\vDash}",
  "\u22AE": "\\cancel{\\Vdash}",
  "\u22AD": "\\nvDash",
  "\u22AC": "\\nvDash",
  "\u22A9": "\\Vdash",
  "\u22A8": "\\vDash",
  "\u22A4": "\\top",
  "\u22A3": "\\dashv",
  "\u22A2": "\\vdash",
  "\u220B": "\\ni",
  "\u22F1": "\\ddots",
  "\u22EF": "\\hdots",
  "\u22EE": "\\vdots",
  "\u03F6": "\\ni",
  ":": ":",
  "...": "\\cdots",
  "..": "..",
  "->": "->",
  "\u2235": "\\because",
  "\u2234": "\\therefore ",
  "\u2063": "",
  ",": ",",
  ";": ";",
  "\u29FD": "\\}",
  "\u29FC": "\\{",
  "\u2998": "\\]",
  "\u2997": "\\[",
  "\u2996": "\\ll",
  "\u2995": "\\gg",
  "\u2994": "\\gg",
  "\u2993": "\\ll",
  "\u2992": "\\gg",
  "\u2991": "\\ll",
  "\u2990": "\\]",
  "\u298F": "\\]",
  "\u298E": "\\]",
  "\u298D": "\\[",
  "\u298C": "\\[",
  "\u298B": "\\]",
  "\u298A": "\\triangleright",
  "\u2989": "\\triangleleft",
  "\u2988": "|\\)",
  "\u2987": "\\(|",
  "\u2986": "|\\)",
  "\u2985": "\\(\\(",
  "\u2984": "|\\}",
  "\u2983": "\\{|",
  "\u2980": "\\||",
  "\u27EF": "\\left. \\right]",
  "\u27EE": "\\left[ \\right.",
  "\u27ED": "\\left. \\right]]",
  "\u27EC": "\\left[[ \\right.",
  "\u27EB": "\\gg",
  "\u27EA": "\\ll",
  "\u27E7": "\\)|",
  "\u27E6": "\\(|",
  "\u2773": "\\left.\\right)",
  "\u2772": "\\left(\\right.",
  "\u232A": "\\rangle",
  "\u2329": "\\langle",
  "\u230B": "\\rfloor",
  "\u230A": "\\lfloor",
  "\u2309": "\\rceil",
  "\u2308": "\\lceil",
  "\u2016": "\\parallel",
  "}": "\\left.\\right\\}",
  "{": "\\left\\{\\right.",
  "]": "\\left]\\right.",
  "[": "\\left[\\right.",
  ")": "\\left.\\right)",
  "(": "\\left(\\right.",
  "\u201D": '\\"',
  "\u201C": "\\text{``}",
  "\u2019": "'",
  "\u2018": "`",
  \u03B1: "\\alpha",
  \u03B2: "\\beta",
  \u03B3: "\\gamma",
  \u0393: "\\Gamma",
  \u03B4: "\\delta",
  \u0394: "\\Delta",
  "\u03F5": "\\epsilon",
  \u03B6: "\\zeta",
  \u03B7: "\\eta",
  \u03B8: "\\theta",
  \u0398: "\\Theta",
  \u03B9: "\\iota",
  \u03BA: "\\kappa",
  \u03BB: "\\lambda",
  \u03BD: "\\nu",
  \u03BF: "\\omicron",
  \u03C0: "\\pi",
  \u03A0: "\\Pi",
  \u03C1: "\\rho",
  \u03C3: "\\sigma",
  \u03A3: "\\Sigma",
  \u03C4: "\\tau",
  \u03C5: "\\upsilon",
  \u03A5: "\\Upsilon",
  \u03D5: "\\phi",
  \u03A6: "\\Phi",
  \u03C7: "\\chi",
  \u03C8: "\\psi",
  \u03A8: "\\Psi",
  \u03C9: "\\omega",
  \u03A9: "\\Omega",
  \u2126: "\\Omega",
  "\u2205": "\\emptyset",
  "\u27F2": "\\circlearrowleft",
  "\u27F3": "\\circlearrowright",
  "\xD7": "\\times",
  "\xBD": "\\dfrac{1}{2}",
  \u03BC: "\\mu",
  \u04E8: "\\theta",
  "\u2713": "\\checkmark",
  "\u27E9": "\\rangle",
  "\u27E8": "\\langle",
  "\xBC": "\\dfrac{1}{4}",
  "\u2026": "\\ldots",
  \u210F: "\\hbar",
  \u211C: "\\mathfrak{R}",
  \u0472: "\\theta",
  \u00D8: "\\emptyset",
  \u03F1: "\\varrho",
  \u0444: "\\phi",
  \u2107: "\\varepsilon",
  T: "T",
  "\u2219": "\\cdot",
  \u03A1: "P",
  "\u221E": "\\infty",
  \u1401: "\\nabla",
  \u019E: "\\eta",
  "\u207A": "^{+}",
  "\u207B": "^{-}",
  "\u207C": "^{=}",
  "\u207D": "^{(}",
  "\u207E": "^{)}",
  "\u3017": "\\)|",
  "\u3016": "\\langle",
  "\u037E": ";",
  "\u0D66": "\\circ",
  "\u2534": "\\perp",
  "\u2715": "\\times",
  "\u23BB": "-",
  "\xBB": "\\gg",
  "\u2B06": "\\uparrow",
  "\u2B07": "\\downarrow",
  "\u2B05": "\\leftarrow",
  "\u27A1": "\\rightarrow",
  "\u23BC": "-",
  "\u239C": "\\mid",
  "\u23A5": "\\mid",
  \u0127: "\\hbar",
  "\u2B95": "\\rightarrow",
  "\u30FB": "\\cdot",
  "\xA6": "\\mid",
  "\xA3": "\\pounds",
  "\xA5": "\\yen",
  "\u2717": "\\times",
  "\u2714": "\\checkmark",
  \u207F: "^{n}",
  "\xAB": "\\ll",
  \u0E40: "\\prime",
  "\u2020": "\\dagger",
  "\u2502": "\\mid",
  $: "\\$",
  "#": "\\#",
  "\u2103": "\\text{\\textdegree C}",
  "\u2109": "\\text{\\textdegree F}",
  "\u2588": "\\blacksquare",
  "\u2127": "\\mho",
  "\u2147": "\\text{e}",
  \u027C: "r",
  "\u2021": "\\ddagger",
  \u1F31: "i",
  \u03D2: "\\Upsilon",
  "\u{1D6FF}": "\\delta",
  "\u02F3": "\\cdot",
  \u0473: "\\theta",
  "\u{1D719}": "\\phi",
  \u041F: "\\prod",
  \u043E: "o",
  \u0452: "\\hbar",
  "\u0245": "\\Lambda",
  "\u0964": "\\mid",
  "\u20AC": "\\euro",
  \u1FE1: "\\bar{u}",
  \u03C6: "\\varphi",
  "\u023C": "c",
  "\u{1D7AE}": "\\epsilon",
  \u03A7: "\\mathsf{X}",
  "\u2099": "_{n}"
};
var allMathSymbolsByChar = {
  "&#xA0;": "\\textrm{ }",
  "&#x2203;": "\\exists",
  "&#x2200;": "\\forall",
  "&#x21D4;": "\\iff",
  "&#x21D2;": "=>",
  "&#xAC;": "\\neg",
  "&#x2124;": "\\mathbb{Z}",
  "&#x211D;": "\\mathbb{R}",
  "&#x211A;": "\\mathbb{Q}",
  "&#x2115;": "\\mathbb{N}",
  "&#x2102;": "CC",
  "&#x25A1;": "\\square",
  "&#x22C4;": "\\diamond",
  "&#x25B3;": "\\triangle",
  "&#x2322;": "\\frown",
  "&#x2220;": "\\angle",
  "&#x22F1;": "\\ddots",
  "&#x22EE;": "\\vdots",
  "&#x2235;": "\\because",
  "&#x2234;": "\\therefore",
  "&#x2135;": "\\aleph",
  "&#x2205;": "\\oslash",
  "&#xB1;": "\\pm",
  "&#x2207;": "\\nabla",
  "&#x2202;": "\\partial",
  "&#x222E;": "\\oint",
  "&#x222B;": "\\int",
  "&#x22C3;": "\\cup",
  "&#x222A;": "\\cup",
  "&#x22C2;": "\\cap",
  "&#x2229;": "\\cap",
  "&#x22C1;": "\\vee",
  "&#x2228;": "\\vee",
  "&#x22C0;": "\\wedge",
  "&#x2227;": "\\wedge",
  "&#x220F;": "\\prod",
  "&#x2211;": "\\sum",
  "&#x2299;": "\\bigodot",
  "&#x2297;": "\\bigoplus",
  "&#x2295;": "o+",
  "&#x2218;": "@",
  "&#x22C8;": "\\bowtie",
  "&#x22CA;": "\\rtimes",
  "&#x22C9;": "\\ltimes",
  "&#xF7;": "\\div",
  "&#xD7;": "\\times",
  "\\": "\\backslash",
  "&#x22C6;": "\\star",
  "&#x2217;": "\\star",
  "&#x22C5;": "\\cdot",
  "&#x3A9;": "\\Omega",
  "&#x3C9;": "\\omega",
  "&#x3A8;": "\\Psi",
  "&#x3C8;": "\\psi",
  "&#x3C7;": "\\chi",
  "&#x3C6;": "\\varphi",
  "&#x3A6;": "\\Phi",
  "&#x3D5;": "\\phi",
  "&#x3C5;": "\\upsilon",
  "&#x3C4;": "\\tau",
  "&#x3A3;": "\\Sigma",
  "&#x3C3;": "\\sigma",
  "&#x3C1;": "\\rho",
  "&#x3A0;": "\\Pi",
  "&#x3C0;": "\\pi",
  "&#x39E;": "\\Xi",
  "&#x3BE;": "\\xi",
  "&#x3BD;": "\\nu",
  "&#x3BC;": "\\mu",
  "&#x39B;": "\\Lambda",
  "&#x3BB;": "\\lambda",
  "&#x3BA;": "\\kappa",
  "&#x3B9;": "\\iota",
  "&#x3D1;": "\\vartheta",
  "&#x398;": "\\Theta",
  "&#x3B8;": "\\theta",
  "&#x3B7;": "\\eta",
  "&#x3B6;": "\\zeta",
  "&#x25B;": "\\varepsilon",
  "&#x3B5;": "\\epsilon",
  "&#x394;": "\\Delta",
  "&#x3B4;": "\\delta",
  "&#x393;": "\\Gamma",
  "&#x3B3;": "\\gamma",
  "&#x3B2;": "\\beta",
  "&#x3B1;": "\\alpha",
  "&#x221E;": "\\infty",
  "\u202C": "\\text{\\textdir TRT}",
  "\u200E": "\\text{\\textdir LTR}"
};
var allMathSymbolsByGlyph = {
  " ": "\\textrm{ }",
  // Invisible operators (U+2061-U+2064): no visual rendering in LaTeX.
  "\u2061": "",
  "\u2062": "",
  "\u2063": "",
  "\u2064": "",
  "\u2203": "\\exists",
  "\u2200": "\\forall",
  "\u21D4": "\\iff",
  "\u21D2": "\\Rightarrow",
  "\xAC": "\\neg",
  "\u25A1": "\\square",
  "\u22C4": "\\diamond",
  "\u25B3": "\\triangle",
  "\u2322": "\\frown",
  "\u2220": "\\angle",
  "\u22F1": "\\ddots",
  "\u22EE": "\\vdots",
  "\u2235": "\\because",
  "\u2234": "\\therefore",
  \u2135: "\\aleph",
  "\u2205": "\\emptyset",
  "\xB1": "\\pm",
  "\u2207": "\\nabla",
  "\u2202": "\\partial",
  "\u222E": "\\oint",
  "\u222B": "\\int",
  "\u22C3": "\\cup",
  "\u222A": "\\cup",
  "\u22C2": "\\cap",
  "\u2229": "\\cap",
  "\u22C1": "\\vee",
  "\u2228": "\\vee",
  "\u22C0": "\\wedge",
  "\u2227": "\\wedge",
  "\u220F": "\\prod",
  "\u2211": "\\sum",
  "\u2299": "\\bigodot",
  "\u2297": "\\bigoplus",
  "\u2295": "o+",
  "\u2218": "@",
  "\u22C8": "\\bowtie",
  "\u22CA": "\\rtimes",
  "\u22C9": "\\ltimes",
  "\xF7": "\\div",
  "\xD7": "\\times",
  "\\": "\\backslash",
  "\u22C6": "\\star",
  "\u2217": "\\star",
  "\u22C5": "\\cdot",
  \u03A9: "\\Omega",
  \u03C9: "\\omega",
  \u03A8: "\\Psi",
  \u03C8: "\\psi",
  \u03C7: "\\chi",
  \u03C6: "\\varphi",
  \u03A6: "\\Phi",
  \u03D5: "\\phi",
  \u03C5: "\\upsilon",
  \u03C4: "\\tau",
  \u03A3: "\\Sigma",
  \u03C3: "\\sigma",
  \u03C1: "\\rho",
  \u03A0: "\\Pi",
  \u03C0: "\\pi",
  \u039E: "\\Xi",
  \u03BE: "\\xi",
  \u03BD: "\\nu",
  \u03BC: "\\mu",
  \u039B: "\\Lambda",
  \u03BB: "\\lambda",
  \u03BA: "\\kappa",
  \u03B9: "\\iota",
  \u03D1: "\\vartheta",
  \u0398: "\\Theta",
  \u03B8: "\\theta",
  \u03B7: "\\eta",
  \u03B6: "\\zeta",
  \u025B: "\\varepsilon",
  \u03B5: "\\epsilon",
  \u0394: "\\Delta",
  \u03B4: "\\delta",
  \u0393: "\\Gamma",
  \u03B3: "\\gamma",
  \u03B2: "\\beta",
  \u03B1: "\\alpha",
  "\u221E": "\\infty",
  "\u03F5": "\\epsilon",
  \u00B5: "\\mu",
  "\xB2": "^{2}",
  \u0131: "\\imath",
  "\u220E": "\\blacksquare",
  \u0E21: "\\mathbf{m}",
  \u2126: "\\Omega",
  "\u27F2": "\\circlearrowleft",
  "\u27F3": "\\circlearrowright",
  \u0924: " ",
  "\xA5": "\\yen",
  "\u207D": "^{(}",
  "\u207E": "^{)}",
  \u00DF: "\\ss",
  \u040B: "\\hbar",
  "\u29B5": "\\ominus",
  "\u22BF": "\\bigtriangleup",
  "\u219B'": "\\nrightarrow",
  "\u2020": "\\dagger",
  \u0E40: "\\prime",
  \u767D: " ",
  "\u2FF1": " ",
  \u2138: "\\wp",
  \uD4F0: " ",
  \u207F: "^{n}",
  "\u2714": "\\checkmark",
  "\u2717": "\\times",
  "\xBD": "\\dfrac{1}{2}",
  \u04E8: "\\theta",
  "\u2713": "\\checkmark",
  "\u27E9": "\\rangle",
  "\u27E8": "\\langle",
  "\u2329": "\\langle",
  "\xBC": "\\dfrac{1}{4}",
  "\u2026": "\\ldots",
  \u210F: "\\hbar",
  \u211C: "\\mathfrak{R}",
  \u0472: "\\theta",
  \u00D8: "\\emptyset",
  \u03F1: "\\varrho",
  \u0444: "\\phi",
  T: "T",
  "\u2219": "\\cdot",
  \u03A1: "P",
  \u1401: "\\nabla",
  \u019E: "\\eta",
  \u0263: "\\gamma",
  \u045B: "\\hbar",
  \u0190: "\\varepsilon",
  "\u2145": "\\_{D}",
  "\u{1D706}": "\\lambda",
  "\u3017": "\\rangle",
  "\u3016": "\\langle",
  "\u037E": ";",
  "\u{1D465}": "x",
  "\u{1D466}": "y",
  "\u{1D467}": "z",
  "\u{1D456}": "i",
  "\u{1D457}": "j",
  "\u{1D458}": "k",
  "\u{1D45A}": "m",
  "\u{1D452}": "e",
  "\u{1D45F}": "r",
  \u0273: "\\eta",
  "\u{1D6FD}": "\\beta",
  "\u2375": "\\omega",
  "\u2118": "\\wp",
  "\u{1D70B}": "\\pi",
  \u0404: "\\epsilon",
  \u0454: "\\epsilon",
  "\u{1D700}": "\\epsilon",
  \u043F: "\\pi",
  \u039D: "\\nu",
  \u0275: "\\theta",
  "\u{1D713}": "\\psi",
  "\u03F4": "\\theta",
  \u0278: "\\phi",
  "\u04F6": "\\Gamma",
  \u026D: "\\ell",
  \u028B: "\\upsilon",
  "\u{1D6DF}": "\\varphi",
  "\u236C": "\\theta",
  \u0424: "\\Phi",
  "\u{1D711}": "\\varphi",
  "\u2148": "i",
  \u03BF: "o",
  \u01A1: "o",
  \u0192: "f",
  "\u2374": "\\rho",
  "\u{1F1FD}": "x",
  "\u{1D45D}": "p",
  "\u{1D45E}": "q",
  "\u{1D460}": "s",
  "\u{1D461}": "t",
  "\u{1D462}": "u",
  "\u{1D463}": "v",
  "\u{1D464}": "w",
  "\u{1D44E}": "a",
  "\u{1D44F}": "b",
  "\u{1D450}": "c",
  "\u{1D451}": "d",
  "\u{1D453}": "f",
  "\u{1D454}": "g",
  "\u{1D459}": "l",
  "\u{1D45B}": "n",
  "\u{1D45C}": "o",
  "\u{1D500}": "w",
  "\u{1D69F}": "v",
  \u1E41: "m",
  "\u0D66": "\\circ",
  "\u2534": "\\perp",
  "\u2715": "\\times",
  "\u2223": "\\mid",
  \u0553: "\\Phi",
  "\u239C": "\\mid",
  \u0127: "\\hbar",
  \u1348: " ",
  "\u29A8": "\\llbracket",
  \u1EBF: "\\hat{e}",
  "\xA2": "\\cent",
  "\u2939": "\\downarrow",
  "\u2938": "\\downarrow",
  "\u2937": "\\Rsh",
  "\u2936": "\\Lsh",
  "\u2935": "\\downarrow",
  "\u2934": "\\uparrow",
  "\u2933": "\\rightarrow",
  "|": "\\mid",
  "\u23A5": "\\mid",
  "\u2665": "\\heartsuit",
  \u041E: "0",
  \u03A5: "Y",
  \u0445: "x",
  "\u{1D4CF}": "z",
  "\u{1D4CE}": "y",
  "\u{1D4CD}": "x",
  \u0440: "p",
  \u0430: "a",
  "\xA3": "\\pounds",
  m: "m",
  "\u{1D6B5}": "\\Xi",
  "\u24EA": "\\textcircled{0}",
  "\u2460": "\\textcircled{1}",
  "\u2461": "\\textcircled{2}",
  "\u2462": "\\textcircled{3}",
  "\u2463": "\\textcircled{4}",
  "\u2464": "\\textcircled{5}",
  "\u2465": "\\textcircled{6}",
  "\u2466": "\\textcircled{7}",
  "\u2467": "\\textcircled{8}",
  "\u2468": "\\textcircled{9}",
  "\u2469": "\\textcircled{10}",
  "\u246A": "\\textcircled{11}",
  "\u246B": "\\textcircled{12}",
  "\u246C": "\\textcircled{13}",
  "\u246D": "\\textcircled{14}",
  "\u246E": "\\textcircled{15}",
  "\u246F": "\\textcircled{16}",
  "\u2470": "\\textcircled{17}",
  "\u2471": "\\textcircled{18}",
  "\u2472": "\\textcircled{19}",
  "\u2473": "\\textcircled{20}",
  "\u3251": "\\textcircled{21}",
  "\u3252": "\\textcircled{22}",
  "\u3253": "\\textcircled{23}",
  "\u3254": "\\textcircled{24}",
  "\u3255": "\\textcircled{25}",
  "\u3256": "\\textcircled{26}",
  "\u3257": "\\textcircled{27}",
  "\u3258": "\\textcircled{28}",
  "\u3259": "\\textcircled{29}",
  "\u325A": "\\textcircled{30}",
  "\u325B": "\\textcircled{31}",
  "\u325C": "\\textcircled{32}",
  "\u325D": "\\textcircled{33}",
  "\u325E": "\\textcircled{34}",
  "\u325F": "\\textcircled{35}",
  "\u32B1": "\\textcircled{36}",
  "\u32B2": "\\textcircled{37}",
  "\u32B3": "\\textcircled{38}",
  "\u32B4": "\\textcircled{39}",
  "\u32B5": "\\textcircled{40}",
  "\u32B6": "\\textcircled{41}",
  "\u32B7": "\\textcircled{42}",
  "\u32B8": "\\textcircled{43}",
  "\u32B9": "\\textcircled{44}",
  "\u32BA": "\\textcircled{45}",
  "\u32BB": "\\textcircled{46}",
  "\u32BC": "\\textcircled{47}",
  "\u32BD": "\\textcircled{48}",
  "\u32BE": "\\textcircled{49}",
  "\u32BF": "\\textcircled{50}",
  "&": "\\&",
  "\u2016": "\\parallel",
  "%": "\\%",
  "\u201C": "\\text{``}",
  $: "\\$",
  "#": "\\#",
  "\u2103": "\\text{\\textdegree C}",
  "\u2109": "\\text{\\textdegree F}",
  "\u2588": "\\blacksquare",
  "\u2127": "\\mho",
  "\u230B": "\\rfloor",
  "\u230A": "\\lfloor",
  "\u2309": "\\rceil",
  "\u2308": "\\lceil",
  \u2107: "\\varepsilon",
  "\u2147": "\\text{e}",
  \u027C: "r",
  "\u219B": "\\nrightarrow",
  "\u02C6": "\\hat{}",
  "\u203E": "\\overline",
  "\u2192": "\\rightarrow",
  "\u2021": "\\ddagger",
  "\u30FB": "\\cdot",
  "\u25B1": "\\square",
  "\u2206": "\\Delta",
  \u1F31: "i",
  "\u2221": "\\angle",
  \u03D2: "\\Upsilon",
  "\u2193": "\\downarrow",
  "\u2191": "\\uparrow",
  "\xBB": "\\gg",
  "\u22A4": "\\top",
  "\u29F8": "/",
  "\u{1D6FF}": "\\delta",
  "\u02F3": "\\cdot",
  "\u0589": ":",
  "\u29AA": "\\measuredangle",
  "\u29A9": "\\measuredangle",
  "\u29AB": "\\measuredangle",
  "\u2981": "\\cdot",
  \u0473: "\\theta",
  "\u29A2": "\\measuredangle",
  "\xB8": ",",
  "\u23BB": "\\overline",
  "\u27E6": "\\llbracket",
  "\u{1D719}": "\\phi",
  \u041F: "\\prod",
  \u043E: "o",
  "\u2248": "\\approx",
  "\u2264": "\\leq",
  \u0452: "\\hbar",
  "\u0245": "\\Lambda",
  \u571F: "\\pm",
  "\u23BC": "-",
  \u5341: "+",
  "\u2260": "\\neq",
  "\u2190": "\\leftarrow",
  "\u0964": "\\mid",
  "\u20AC": "\\euro",
  "\u02D8": " ",
  \u1FE1: "\\bar{u}",
  "\u2225": "\\parallel",
  "\u2194": "\\leftrightarrow",
  "\u221A": "\\sqrt{}",
  "\u023C": "c",
  "\u{1D7AE}": "\\epsilon",
  "\xB7": "\\cdot",
  "\u29AC": "\\measuredangle",
  "\u29AE": "\\measuredangle",
  "\u29AD": "\\measuredangle",
  "\xAB": "\\ll",
  \u03A7: "\\mathsf{X}",
  "\u2502": "\\mid",
  "\u232A": "\\rangle",
  "\u2099": "_{n}",
  "\u25AB": "\\square",
  "\u25CF": "\\circle",
  "\u201D": '\\"'
};
var doubleBarFenceGlyphs = /* @__PURE__ */ new Set(["||", "\u2016", "\u2225"]);
var latexAccents = ["\\hat", "\\bar", "\\underbrace", "\\overbrace"];
var mathNumberByGlyph = {
  "\u2080": "_{0}",
  "\u2081": "_{1}",
  "\u2082": "_{2}",
  "\u2083": "_{3}",
  "\u2084": "_{4}",
  "\u2085": "_{5}",
  "\u2086": "_{6}",
  "\u2087": "_{7}",
  "\u2088": "_{8}",
  "\u2089": "_{9}",
  "\u2070": "^{0}",
  "\xB9": "^{1}",
  "\xB2": "^{2}",
  "\xB3": "^{3}",
  "\u2074": "^{4}",
  "\u2075": "^{5}",
  "\u2076": "^{6}",
  "\u2077": "^{7}",
  "\u2078": "^{8}",
  "\u2079": "^{9}",
  \u207F: "^{n}",
  "\u2099": "_{n}",
  "\u24EA": "\\textcircled{0}",
  "\u2460": "\\textcircled{1}",
  "\u2461": "\\textcircled{2}",
  "\u2462": "\\textcircled{3}",
  "\u2463": "\\textcircled{4}",
  "\u2464": "\\textcircled{5}",
  "\u2465": "\\textcircled{6}",
  "\u2466": "\\textcircled{7}",
  "\u2467": "\\textcircled{8}",
  "\u2468": "\\textcircled{9}",
  "\u2469": "\\textcircled{10}",
  "\u246A": "\\textcircled{11}",
  "\u246B": "\\textcircled{12}",
  "\u246C": "\\textcircled{13}",
  "\u246D": "\\textcircled{14}",
  "\u246E": "\\textcircled{15}",
  "\u246F": "\\textcircled{16}",
  "\u2470": "\\textcircled{17}",
  "\u2471": "\\textcircled{18}",
  "\u2472": "\\textcircled{19}",
  "\u2473": "\\textcircled{20}",
  "\u3251": "\\textcircled{21}",
  "\u3252": "\\textcircled{22}",
  "\u3253": "\\textcircled{23}",
  "\u3254": "\\textcircled{24}",
  "\u3255": "\\textcircled{25}",
  "\u3256": "\\textcircled{26}",
  "\u3257": "\\textcircled{27}",
  "\u3258": "\\textcircled{28}",
  "\u3259": "\\textcircled{29}",
  "\u325A": "\\textcircled{30}",
  "\u325B": "\\textcircled{31}",
  "\u325C": "\\textcircled{32}",
  "\u325D": "\\textcircled{33}",
  "\u325E": "\\textcircled{34}",
  "\u325F": "\\textcircled{35}",
  "\u32B1": "\\textcircled{36}",
  "\u32B2": "\\textcircled{37}",
  "\u32B3": "\\textcircled{38}",
  "\u32B4": "\\textcircled{39}",
  "\u32B5": "\\textcircled{40}",
  "\u32B6": "\\textcircled{41}",
  "\u32B7": "\\textcircled{42}",
  "\u32B8": "\\textcircled{43}",
  "\u32B9": "\\textcircled{44}",
  "\u32BA": "\\textcircled{45}",
  "\u32BB": "\\textcircled{46}",
  "\u32BC": "\\textcircled{47}",
  "\u32BD": "\\textcircled{48}",
  "\u32BE": "\\textcircled{49}",
  "\u32BF": "\\textcircled{50}",
  "\xBD": "\\dfrac{1}{2}",
  "\u2153": "\\dfrac{1}{3}",
  "\u2154": "\\dfrac{2}{3}",
  "\xBC": "\\dfrac{1}{4}",
  "\xBE": "\\dfrac{3}{4}",
  "\u2155": "\\dfrac{1}{5}",
  "\u2156": "\\dfrac{2}{5}",
  "\u2157": "\\dfrac{3}{5}",
  "\u2158": "\\dfrac{4}{5}",
  "\u2159": "\\dfrac{1}{6}",
  "\u215A": "\\dfrac{5}{6}",
  "\u2150": "\\dfrac{1}{7}",
  "\u215B": "\\dfrac{1}{8}",
  "\u215C": "\\dfrac{3}{8}",
  "\u215D": "\\dfrac{5}{8}",
  "\u215E": "\\dfrac{7}{8}",
  "\u2151": "\\dfrac{1}{9}",
  "\u2152": "\\dfrac{1}{10}"
};
var HashUTF8ToLtXConverter = class {
  convert(char) {
    const isAlphanumeric = char.match(/[a-z0-9]/i);
    if (isAlphanumeric) {
      return char;
    }
    const accentChar = vowelsWithAccents[char];
    if (accentChar) {
      const lxtCmd = this.convertAccentCharToLtX(accentChar);
      if (lxtCmd) {
        return lxtCmd;
      }
      return char;
    }
    const specialChar = this.convertSpecialCharToLtX(char);
    if (specialChar) {
      return specialChar;
    }
    return char;
  }
  convertAccentCharToLtX(char) {
    const { char: vowel, accent } = char;
    const cmd = accentToLTXCmd[accent];
    if (!cmd) {
      return null;
    }
    return `\\${cmd}{${vowel}}`;
  }
  convertSpecialCharToLtX(char) {
    const specialFontChar = specialFontChars[char];
    if (!specialFontChar) {
      return null;
    }
    const { letter, fontCmd } = specialFontChar;
    return `\\${fontCmd}{${letter}}`;
  }
};
var vowelsWithAccents = {
  \u00E1: { char: "a", accent: "\xB4" },
  \u00E0: { char: "a", accent: "`" },
  \u00E2: { char: "a", accent: "^" },
  \u00E3: { char: "a", accent: "~" },
  \u00E4: { char: "a", accent: "\xA8" },
  \u00E5: { char: "a", accent: "\u02DA" },
  \u0105: { char: "a", accent: "\u02D9" },
  \u0103: { char: "a", accent: "\u02D8" },
  \u01CE: { char: "a", accent: "\u02C7" },
  \u01DF: { char: "a", accent: "\u02C6" },
  \u01FB: { char: "a", accent: "\u02D9" },
  \u01E1: { char: "a", accent: "-" },
  \u0101: { char: "a", accent: "-" },
  \u00E9: { char: "e", accent: "\xB4" },
  \u00E8: { char: "e", accent: "`" },
  \u00EA: { char: "e", accent: "^" },
  \u00EB: { char: "e", accent: "\xA8" },
  \u0119: { char: "e", accent: "\u02D9" },
  \u011B: { char: "e", accent: "\u02C7" },
  \u0207: { char: "i", accent: "^" },
  \u0451: { char: "e", accent: "\xA8" },
  \u0113: { char: "e", accent: "-" },
  \u00ED: { char: "i", accent: "\xB4" },
  \u00EC: { char: "i", accent: "`" },
  \u00EE: { char: "i", accent: "^" },
  \u00EF: { char: "i", accent: "\xA8" },
  \u012F: { char: "i", accent: "\u02D9" },
  \u01D0: { char: "i", accent: "\u02C7" },
  \u0209: { char: "i", accent: "`" },
  \u020B: { char: "i", accent: "\xA8" },
  \u012B: { char: "i", accent: "-" },
  \u00F3: { char: "o", accent: "\xB4" },
  \u00F2: { char: "o", accent: "`" },
  \u00F4: { char: "o", accent: "^" },
  \u00F5: { char: "o", accent: "~" },
  \u00F6: { char: "o", accent: "\xA8" },
  \u0151: { char: "o", accent: "\u02DD" },
  \u01D2: { char: "o", accent: "\u02C7" },
  \u020D: { char: "o", accent: "`" },
  \u020F: { char: "o", accent: "\xA8" },
  \u022B: { char: "o", accent: "\u02D8" },
  \u022D: { char: "o", accent: "\u02DD" },
  \u022F: { char: "o", accent: "\u02D9" },
  \u014D: { char: "o", accent: "-" },
  \u00FA: { char: "u", accent: "\xB4" },
  \u00F9: { char: "u", accent: "`" },
  \u00FB: { char: "u", accent: "^" },
  \u00FC: { char: "u", accent: "\xA8" },
  \u0171: { char: "u", accent: "\u02DD" },
  \u01D4: { char: "u", accent: "\u02C7" },
  \u01D6: { char: "u", accent: "\xA8" },
  \u01D8: { char: "u", accent: "\xA8" },
  \u01DA: { char: "u", accent: "\xA8" },
  \u01DC: { char: "u", accent: "\xA8" },
  \u0215: { char: "u", accent: "`" },
  \u0217: { char: "u", accent: "\xA8" },
  \u016B: { char: "u", accent: "-" },
  \u00FD: { char: "y", accent: "\xB4" },
  \u1EF3: { char: "y", accent: "`" },
  \u0177: { char: "y", accent: "^" },
  \u00FF: { char: "y", accent: "\xA8" },
  \u0233: { char: "y", accent: "-" },
  \u00C1: { char: "A", accent: "\xB4" },
  \u00C0: { char: "A", accent: "`" },
  \u00C2: { char: "A", accent: "^" },
  \u00C3: { char: "A", accent: "~" },
  \u00C4: { char: "A", accent: "\xA8" },
  \u00C5: { char: "A", accent: "\u02DA" },
  \u212B: { char: "A", accent: "\u02DA" },
  \u0226: { char: "A", accent: "\u02D9" },
  \u0102: { char: "A", accent: "\u02D8" },
  \u01CD: { char: "A", accent: "\u02C7" },
  \u01DE: { char: "A", accent: "\u02DD" },
  \u01FA: { char: "A", accent: "\u02DA" },
  \u01E0: { char: "A", accent: "-" },
  \u0100: { char: "A", accent: "-" },
  \u00C9: { char: "E", accent: "\xB4" },
  \u00C8: { char: "E", accent: "`" },
  \u0116: { char: "E", accent: "\u02D9" },
  \u00CA: { char: "E", accent: "^" },
  \u00CB: { char: "E", accent: "\xA8" },
  \u011A: { char: "E", accent: "\u02C7" },
  \u0204: { char: "E", accent: "`" },
  \u0206: { char: "E", accent: "\xA8" },
  \u0112: { char: "E", accent: "-" },
  \u00CD: { char: "I", accent: "\xB4" },
  \u00CC: { char: "I", accent: "`" },
  \u00CE: { char: "I", accent: "^" },
  \u00CF: { char: "I", accent: "\xA8" },
  \u012C: { char: "I", accent: "\u02D8" },
  \u01CF: { char: "I", accent: "\u02C7" },
  \u0208: { char: "I", accent: "`" },
  \u020A: { char: "I", accent: "\xA8" },
  \u012A: { char: "I", accent: "-" },
  \u00D3: { char: "O", accent: "\xB4" },
  \u00D2: { char: "O", accent: "`" },
  \u00D4: { char: "O", accent: "^" },
  \u00D5: { char: "O", accent: "~" },
  \u00D6: { char: "O", accent: "\xA8" },
  \u0150: { char: "O", accent: "\u02DD" },
  \u01D1: { char: "O", accent: "\u02C7" },
  \u020C: { char: "O", accent: "`" },
  \u020E: { char: "O", accent: "\xA8" },
  \u022A: { char: "O", accent: "\u02D8" },
  \u022C: { char: "O", accent: "\u02DD" },
  \u022E: { char: "O", accent: "\u02D9" },
  \u014C: { char: "O", accent: "-" },
  \u00DA: { char: "U", accent: "\xB4" },
  \u00D9: { char: "U", accent: "`" },
  \u00DB: { char: "U", accent: "^" },
  \u00DC: { char: "U", accent: "\xA8" },
  \u0170: { char: "U", accent: "\u02DD" },
  \u01D3: { char: "U", accent: "\u02C7" },
  \u01D5: { char: "U", accent: "\xA8" },
  \u0214: { char: "U", accent: "`" },
  \u0216: { char: "U", accent: "\xA8" },
  \u016A: { char: "U", accent: "-" },
  \u00DD: { char: "Y", accent: "\xB4" },
  \u1EF2: { char: "Y", accent: "`" },
  \u0176: { char: "Y", accent: "^" },
  \u0178: { char: "Y", accent: "\xA8" },
  \u0232: { char: "Y", accent: "-" },
  \u00F1: { char: "n", accent: "~" },
  \u00D1: { char: "N", accent: "~" },
  \u00E7: { char: "c", accent: "\u02D9" },
  \u00C7: { char: "C", accent: "\u02D9" },
  \u1E7D: { char: "v", accent: "~" },
  \u1E7C: { char: "V", accent: "~" },
  \u0135: { char: "j", accent: "^" },
  \u0134: { char: "J", accent: "^" },
  \u017A: { char: "z", accent: "\xB4" },
  \u0179: { char: "Z", accent: "\xB4" },
  \u017B: { char: "Z", accent: "^" },
  \u017C: { char: "z", accent: "^" },
  \u017D: { char: "Z", accent: "\u02C7" },
  \u017E: { char: "z", accent: "\u02C7" },
  \u1E91: { char: "z", accent: "\u02C6" }
};
var accentToLTXCmd = {
  "\xB4": "acute",
  "`": "grave",
  "^": "hat",
  "~": "tilde",
  "\xA8": "ddot",
  "\u02DA": "mathring",
  "\u02D8": "breve",
  "\u02C7": "check",
  "\u02DD": "H",
  "\u02D9": "dot",
  "-": "bar",
  "\u02C6": "hat",
  "\u02DC": "tilde"
};
var specialFontChars = {
  // letter A mathbf
  "\u{1D400}": { letter: "A", fontCmd: "mathbf" },
  "\u{1D401}": { letter: "B", fontCmd: "mathbf" },
  "\u{1D402}": { letter: "C", fontCmd: "mathbf" },
  "\u{1D403}": { letter: "D", fontCmd: "mathbf" },
  "\u{1D404}": { letter: "E", fontCmd: "mathbf" },
  \u0395: { letter: "E", fontCmd: "mathbf" },
  "\u{1D405}": { letter: "F", fontCmd: "mathbf" },
  "\u{1D406}": { letter: "G", fontCmd: "mathbf" },
  "\u{1D407}": { letter: "H", fontCmd: "mathbf" },
  "\u{1D408}": { letter: "I", fontCmd: "mathbf" },
  "\u{1D409}": { letter: "J", fontCmd: "mathbf" },
  "\u{1D40A}": { letter: "K", fontCmd: "mathbf" },
  "\u{1D40B}": { letter: "L", fontCmd: "mathbf" },
  "\u{1D40C}": { letter: "M", fontCmd: "mathbf" },
  "\u{1D40D}": { letter: "N", fontCmd: "mathbf" },
  "\u{1D40E}": { letter: "O", fontCmd: "mathbf" },
  "\u{1D40F}": { letter: "P", fontCmd: "mathbf" },
  "\u{1D410}": { letter: "Q", fontCmd: "mathbf" },
  "\u{1D411}": { letter: "R", fontCmd: "mathbf" },
  "\u{1D412}": { letter: "S", fontCmd: "mathbf" },
  "\u{1D413}": { letter: "T", fontCmd: "mathbf" },
  "\u{1D414}": { letter: "U", fontCmd: "mathbf" },
  "\u{1D415}": { letter: "V", fontCmd: "mathbf" },
  "\u{1D416}": { letter: "W", fontCmd: "mathbf" },
  "\u{1D417}": { letter: "X", fontCmd: "mathbf" },
  "\u{1D786}": { letter: "X", fontCmd: "mathbf" },
  "\u{1D418}": { letter: "Y", fontCmd: "mathbf" },
  "\u{1D419}": { letter: "Z", fontCmd: "mathbf" },
  "\u{1D7CE}": { letter: "0", fontCmd: "mathbf" },
  "\u{1D7CF}": { letter: "1", fontCmd: "mathbf" },
  "\u{1D7D0}": { letter: "2", fontCmd: "mathbf" },
  "\u{1D7D1}": { letter: "3", fontCmd: "mathbf" },
  "\u{1D7D2}": { letter: "4", fontCmd: "mathbf" },
  "\u{1D7D3}": { letter: "5", fontCmd: "mathbf" },
  "\u{1D7D4}": { letter: "6", fontCmd: "mathbf" },
  "\u{1D7D5}": { letter: "7", fontCmd: "mathbf" },
  "\u{1D7D6}": { letter: "8", fontCmd: "mathbf" },
  "\u{1D7D7}": { letter: "9", fontCmd: "mathbf" },
  // letter A mathit
  "\u{1D434}": { letter: "A", fontCmd: "mathit" },
  "\u{1D435}": { letter: "B", fontCmd: "mathit" },
  "\u{1D436}": { letter: "C", fontCmd: "mathit" },
  "\u{1D437}": { letter: "D", fontCmd: "mathit" },
  "\u{1D438}": { letter: "E", fontCmd: "mathit" },
  "\u{1D439}": { letter: "F", fontCmd: "mathit" },
  "\u{1D43A}": { letter: "G", fontCmd: "mathit" },
  "\u{1D43B}": { letter: "H", fontCmd: "mathit" },
  "\u{1D43C}": { letter: "I", fontCmd: "mathit" },
  \u0399: { letter: "I", fontCmd: "mathit" },
  "\u{1D43D}": { letter: "J", fontCmd: "mathit" },
  "\u{1D43E}": { letter: "K", fontCmd: "mathit" },
  "\u{1D43F}": { letter: "L", fontCmd: "mathit" },
  "\u{1D440}": { letter: "M", fontCmd: "mathit" },
  "\u{1D441}": { letter: "N", fontCmd: "mathit" },
  "\u{1D442}": { letter: "O", fontCmd: "mathit" },
  "\u{1D443}": { letter: "P", fontCmd: "mathit" },
  "\u{1D444}": { letter: "Q", fontCmd: "mathit" },
  "\u{1D445}": { letter: "R", fontCmd: "mathit" },
  "\u{1D446}": { letter: "S", fontCmd: "mathit" },
  "\u{1D447}": { letter: "T", fontCmd: "mathit" },
  "\u{1D448}": { letter: "U", fontCmd: "mathit" },
  "\u{1D449}": { letter: "V", fontCmd: "mathit" },
  "\u{1D44A}": { letter: "W", fontCmd: "mathit" },
  "\u{1D44B}": { letter: "X", fontCmd: "mathit" },
  "\u{1D44C}": { letter: "Y", fontCmd: "mathit" },
  "\u{1D44D}": { letter: "Z", fontCmd: "mathit" },
  // letter A mathbb
  "\u{1D538}": { letter: "A", fontCmd: "mathbb" },
  "\u{1D539}": { letter: "B", fontCmd: "mathbb" },
  \u2102: { letter: "C", fontCmd: "mathbb" },
  "\u{1D53B}": { letter: "D", fontCmd: "mathbb" },
  "\u{1D53C}": { letter: "E", fontCmd: "mathbb" },
  "\u{1D53D}": { letter: "F", fontCmd: "mathbb" },
  "\u{1D53E}": { letter: "G", fontCmd: "mathbb" },
  \u210D: { letter: "H", fontCmd: "mathbb" },
  "\u{1D540}": { letter: "I", fontCmd: "mathbb" },
  "\u{1D541}": { letter: "J", fontCmd: "mathbb" },
  "\u{1D542}": { letter: "K", fontCmd: "mathbb" },
  "\u{1D543}": { letter: "L", fontCmd: "mathbb" },
  "\u{1D544}": { letter: "M", fontCmd: "mathbb" },
  \u2115: { letter: "N", fontCmd: "mathbb" },
  "\u{1D546}": { letter: "O", fontCmd: "mathbb" },
  \u2119: { letter: "P", fontCmd: "mathbb" },
  \u211A: { letter: "Q", fontCmd: "mathbb" },
  \u211D: { letter: "R", fontCmd: "mathbb" },
  "\u{1D54A}": { letter: "S", fontCmd: "mathbb" },
  "\u{1D54B}": { letter: "T", fontCmd: "mathbb" },
  "\u{1D54C}": { letter: "U", fontCmd: "mathbb" },
  "\u{1D54D}": { letter: "V", fontCmd: "mathbb" },
  "\u{1D54E}": { letter: "W", fontCmd: "mathbb" },
  "\u{1D54F}": { letter: "X", fontCmd: "mathbb" },
  "\u{1D550}": { letter: "Y", fontCmd: "mathbb" },
  \u2124: { letter: "Z", fontCmd: "mathbb" },
  "\u{1D7D8}": { letter: "0", fontCmd: "mathbb" },
  "\u{1D7D9}": { letter: "1", fontCmd: "mathbb" },
  "\u{1D7DA}": { letter: "2", fontCmd: "mathbb" },
  "\u{1D7DB}": { letter: "3", fontCmd: "mathbb" },
  "\u{1D7DC}": { letter: "4", fontCmd: "mathbb" },
  "\u{1D7DD}": { letter: "5", fontCmd: "mathbb" },
  "\u{1D7DE}": { letter: "6", fontCmd: "mathbb" },
  "\u{1D7DF}": { letter: "7", fontCmd: "mathbb" },
  "\u{1D7E0}": { letter: "8", fontCmd: "mathbb" },
  "\u{1D7E1}": { letter: "9", fontCmd: "mathbb" },
  // letter A mathcal
  "\u{1D49C}": { letter: "A", fontCmd: "mathcal" },
  "\u{1D4D0}": { letter: "A", fontCmd: "mathcal" },
  \u212C: { letter: "B", fontCmd: "mathcal" },
  "\u{1D49E}": { letter: "C", fontCmd: "mathcal" },
  "\u{1D49F}": { letter: "D", fontCmd: "mathcal" },
  "\u{1D4D3}": { letter: "D", fontCmd: "mathcal" },
  \u2130: { letter: "E", fontCmd: "mathcal" },
  \u2131: { letter: "F", fontCmd: "mathcal" },
  "\u{1D4D5}": { letter: "F", fontCmd: "mathcal" },
  "\u{1D4A2}": { letter: "G", fontCmd: "mathcal" },
  \u210B: { letter: "H", fontCmd: "mathcal" },
  \u2110: { letter: "I", fontCmd: "mathcal" },
  "\u{1D4A5}": { letter: "J", fontCmd: "mathcal" },
  "\u{1D4A6}": { letter: "K", fontCmd: "mathcal" },
  \u2112: { letter: "L", fontCmd: "mathcal" },
  "\u{1D4DB}": { letter: "L", fontCmd: "mathcal" },
  \u2133: { letter: "M", fontCmd: "mathcal" },
  "\u{1D4A9}": { letter: "N", fontCmd: "mathcal" },
  "\u{1D4AA}": { letter: "O", fontCmd: "mathcal" },
  "\u{1D4DE}": { letter: "O", fontCmd: "mathcal" },
  "\u{1D4AB}": { letter: "P", fontCmd: "mathcal" },
  "\u{1D4AC}": { letter: "Q", fontCmd: "mathcal" },
  \u211B: { letter: "R", fontCmd: "mathcal" },
  "\u{1D57D}": { letter: "R", fontCmd: "mathcal" },
  "\u211F": { letter: "R", fontCmd: "mathcal" },
  "\u{1D4AE}": { letter: "S", fontCmd: "mathcal" },
  "\u{1D4AF}": { letter: "T", fontCmd: "mathcal" },
  "\u{1D4B0}": { letter: "U", fontCmd: "mathcal" },
  "\u{1D4B1}": { letter: "V", fontCmd: "mathcal" },
  "\u{1D4B2}": { letter: "W", fontCmd: "mathcal" },
  "\u{1D4B3}": { letter: "X", fontCmd: "mathcal" },
  "\u{1D4B4}": { letter: "Y", fontCmd: "mathcal" },
  "\u{1D4B5}": { letter: "Z", fontCmd: "mathcal" },
  // letter A mathfrak
  "\u{1D504}": { letter: "A", fontCmd: "mathfrak" },
  "\u{1D505}": { letter: "B", fontCmd: "mathfrak" },
  \u212D: { letter: "C", fontCmd: "mathfrak" },
  "\u{1D507}": { letter: "D", fontCmd: "mathfrak" },
  "\u{1D508}": { letter: "E", fontCmd: "mathfrak" },
  "\u{1D509}": { letter: "F", fontCmd: "mathfrak" },
  "\u{1D50A}": { letter: "G", fontCmd: "mathfrak" },
  \u210C: { letter: "H", fontCmd: "mathfrak" },
  \u2111: { letter: "I", fontCmd: "mathfrak" },
  "\u{1D50D}": { letter: "J", fontCmd: "mathfrak" },
  "\u{1D50E}": { letter: "K", fontCmd: "mathfrak" },
  "\u{1D50F}": { letter: "L", fontCmd: "mathfrak" },
  "\u{1D510}": { letter: "M", fontCmd: "mathfrak" },
  "\u{1D511}": { letter: "N", fontCmd: "mathfrak" },
  "\u{1D512}": { letter: "O", fontCmd: "mathfrak" },
  "\u{1D513}": { letter: "P", fontCmd: "mathfrak" },
  "\u{1D514}": { letter: "Q", fontCmd: "mathfrak" },
  \u211C: { letter: "R", fontCmd: "mathfrak" },
  "\u{1D516}": { letter: "S", fontCmd: "mathfrak" },
  "\u{1D517}": { letter: "T", fontCmd: "mathfrak" },
  "\u{1D518}": { letter: "U", fontCmd: "mathfrak" },
  "\u{1D519}": { letter: "V", fontCmd: "mathfrak" },
  "\u{1D51A}": { letter: "W", fontCmd: "mathfrak" },
  "\u{1D51B}": { letter: "X", fontCmd: "mathfrak" },
  "\u{1D51C}": { letter: "Y", fontCmd: "mathfrak" },
  \u2128: { letter: "Z", fontCmd: "mathfrak" },
  // letter A mathsf
  "\u{1D5A0}": { letter: "A", fontCmd: "mathsf" },
  \u0391: { letter: "A", fontCmd: "mathsf" },
  "\u{1D5A1}": { letter: "B", fontCmd: "mathsf" },
  \u0392: { letter: "B", fontCmd: "mathsf" },
  "\u{1D5A2}": { letter: "C", fontCmd: "mathsf" },
  "\u{1D5A3}": { letter: "D", fontCmd: "mathsf" },
  "\u{1D5A4}": { letter: "E", fontCmd: "mathsf" },
  "\u{1D5A5}": { letter: "F", fontCmd: "mathsf" },
  "\u{1D5A6}": { letter: "G", fontCmd: "mathsf" },
  "\u{1D5A7}": { letter: "H", fontCmd: "mathsf" },
  "\u{1D5A8}": { letter: "I", fontCmd: "mathsf" },
  "\u{1D5A9}": { letter: "J", fontCmd: "mathsf" },
  "\u0237": { letter: "J", fontCmd: "mathsf" },
  "\u{1D5AA}": { letter: "K", fontCmd: "mathsf" },
  \u039A: { letter: "K", fontCmd: "mathsf" },
  "\u{1D5AB}": { letter: "L", fontCmd: "mathsf" },
  "\u{1D5AC}": { letter: "M", fontCmd: "mathsf" },
  "\u{1D5AD}": { letter: "N", fontCmd: "mathsf" },
  "\u{1D5AE}": { letter: "O", fontCmd: "mathsf" },
  "\u{1D5AF}": { letter: "P", fontCmd: "mathsf" },
  "\u{1D5B0}": { letter: "Q", fontCmd: "mathsf" },
  "\u{1D5B1}": { letter: "R", fontCmd: "mathsf" },
  "\u{1D5B2}": { letter: "S", fontCmd: "mathsf" },
  "\u{1D5B3}": { letter: "T", fontCmd: "mathsf" },
  "\u{1D5B4}": { letter: "U", fontCmd: "mathsf" },
  "\u{1D5B5}": { letter: "V", fontCmd: "mathsf" },
  "\u{1D5B6}": { letter: "W", fontCmd: "mathsf" },
  "\u{1D5B7}": { letter: "X", fontCmd: "mathsf" },
  \u03A7: { letter: "X", fontCmd: "mathsf" },
  "\u{1D5B8}": { letter: "Y", fontCmd: "mathsf" },
  "\u{1D5B9}": { letter: "Z", fontCmd: "mathsf" },
  // letter A mathtt
  "\u{1D6A8}": { letter: "A", fontCmd: "mathtt" },
  "\u{1D6A9}": { letter: "B", fontCmd: "mathtt" },
  "\u{1D6AA}": { letter: "\\Gamma", fontCmd: "mathtt" },
  "\u{1D6AB}": { letter: "\\Delta", fontCmd: "mathtt" },
  "\u{1D6AC}": { letter: "E", fontCmd: "mathtt" },
  "\u{1D6AD}": { letter: "F", fontCmd: "mathtt" },
  "\u{1D6AE}": { letter: "G", fontCmd: "mathtt" },
  "\u{1D6AF}": { letter: "\\Theta", fontCmd: "mathtt" },
  "\u{1D6B0}": { letter: "I", fontCmd: "mathtt" },
  "\u{1D6B1}": { letter: "J", fontCmd: "mathtt" },
  "\u{1D6B2}": { letter: "\\Lambda", fontCmd: "mathtt" },
  "\u{1D6B3}": { letter: "L", fontCmd: "mathtt" },
  "\u{1D6B4}": { letter: "M", fontCmd: "mathtt" },
  "\u{1D6B5}": { letter: "\\Pi", fontCmd: "mathtt" },
  "\u{1D6B6}": { letter: "O", fontCmd: "mathtt" },
  "\u{1D6B7}": { letter: "\\Pi", fontCmd: "mathtt" },
  "\u{1D6B8}": { letter: "Q", fontCmd: "mathtt" },
  "\u{1D6B9}": { letter: "R", fontCmd: "mathtt" },
  "\u{1D6BA}": { letter: "S", fontCmd: "mathtt" },
  "\u{1D6BB}": { letter: "T", fontCmd: "mathtt" },
  "\u{1D6BC}": { letter: "U", fontCmd: "mathtt" },
  "\u{1D6BD}": { letter: "\\Phi", fontCmd: "mathtt" },
  "\u{1D6BE}": { letter: "W", fontCmd: "mathtt" },
  "\u{1D6BF}": { letter: "\\Psi", fontCmd: "mathtt" },
  "\u{1D6C0}": { letter: "\\Omega", fontCmd: "mathtt" }
};
var GenericWrapper = class {
  constructor(open, close) {
    this._open = "\\left" + this._toLatexDelimiter(open);
    this._close = "\\right" + this._toLatexDelimiter(close);
  }
  /** @returns `str` wrapped in `\left`/`\right` delimiters. */
  wrap(str) {
    return new Wrapper(this._open, this._close).wrap(str);
  }
  /** Maps a MathML fence character to its valid `\left`/`\right` delimiter form. */
  _toLatexDelimiter(delimiter) {
    var _a;
    return (_a = DELIMITER_TRANSLATIONS.get(delimiter)) !== null && _a !== void 0 ? _a : delimiter;
  }
};
var DELIMITER_TRANSLATIONS = new Map([
  ["{", "\\{"],
  ["}", "\\}"],
  ...[...doubleBarFenceGlyphs].map((glyph) => [glyph, "\\|"])
]);
var JoinWithManySeparators = class _JoinWithManySeparators {
  constructor(separators) {
    this._separators = separators;
  }
  /**
   * @param arr - the strings to join.
   * @param separators - the separators to place between items, in order.
   * @param defaultSeparator - separator used when `separators` is empty.
   * @returns the joined string.
   */
  static join(arr, separators, defaultSeparator = "") {
    const effectiveSeparators = separators.length > 0 ? separators : defaultSeparator !== void 0 ? [defaultSeparator] : [];
    return new _JoinWithManySeparators(effectiveSeparators)._join(arr);
  }
  _join(arr) {
    return arr.reduce((joinedStr, currentStr, currentIndex, strArr) => {
      const separator = currentIndex === strArr.length - 1 ? "" : this._get(currentIndex);
      return joinedStr + currentStr + separator;
    }, "");
  }
  _get(index) {
    if (!this._separators[index])
      return this._separators[this._separators.length - 1];
    return this._separators[index];
  }
};
var ownLookup = (table, key) => Object.prototype.hasOwnProperty.call(table, key) ? table[key] : void 0;
var Character = class _Character {
  constructor(value) {
    this._value = value;
  }
  static apply(value) {
    return new _Character(value)._apply();
  }
  _apply() {
    var _a, _b, _c;
    return (_c = (_b = (_a = this._findByCharacter()) !== null && _a !== void 0 ? _a : this._findByGlyph()) !== null && _b !== void 0 ? _b : this._findByNumber()) !== null && _c !== void 0 ? _c : new HashUTF8ToLtXConverter().convert(this._value);
  }
  _findByCharacter() {
    return ownLookup(allMathSymbolsByChar, this._value);
  }
  _findByGlyph() {
    return ownLookup(allMathSymbolsByGlyph, this._value);
  }
  _findByNumber() {
    return ownLookup(mathNumberByGlyph, this._value);
  }
};
var MI = class {
  constructor(mathElement) {
    this.utf8Converter = new HashUTF8ToLtXConverter();
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const normalizedValue = normalizeWhiteSpaces(this._mathmlElement.value);
    if (normalizedValue === " ")
      return Character.apply(normalizedValue);
    const trimmedValue = normalizedValue.trim();
    const convertedChar = Character.apply(trimmedValue);
    const parsedChar = this.utf8Converter.convert(convertedChar);
    if (parsedChar !== convertedChar)
      return parsedChar;
    return this.wrapInMathVariant(convertedChar, this.getMathVariant(this._mathmlElement.attributes));
  }
  /** Extracts the `mathvariant` attribute value, or undefined when absent. */
  getMathVariant(attributes) {
    if (!attributes || !attributes.mathvariant)
      return void 0;
    return attributes.mathvariant;
  }
  /** Wraps the value in the LaTeX font command matching the given `mathvariant`. */
  wrapInMathVariant(value, mathVariant) {
    switch (mathVariant) {
      case "bold":
        return `\\mathbf{${value}}`;
      case "italic":
        return `\\mathit{${value}}`;
      case "bold-italic":
        return `\\mathbf{\\mathit{${value}}}`;
      case "double-struck":
        return `\\mathbb{${value}}`;
      case "bold-fraktur":
        return `\\mathbf{\\mathfrak{${value}}}`;
      case "script":
        return `\\mathcal{${value}}`;
      case "bold-script":
        return `\\mathbf{\\mathcal{${value}}}`;
      case "fraktur":
        return `\\mathfrak{${value}}`;
      case "sans-serif":
        return `\\mathsf{${value}}`;
      case "bold-sans-serif":
        return `\\mathbf{\\mathsf{${value}}}`;
      case "sans-serif-italic":
        return `\\mathsf{\\mathit{${value}}}`;
      case "sans-serif-bold-italic":
        return `\\mathbf{\\mathsf{\\mathit{${value}}}}`;
      case "monospace":
        return `\\mathtt{${value}}`;
      default:
        return value;
    }
  }
};
var Operator = class _Operator {
  constructor(value) {
    this._value = value;
  }
  static operate(value) {
    return new _Operator(value)._operate();
  }
  _operate() {
    var _a, _b, _c;
    return (_c = (_b = (_a = this._findByCharacter()) !== null && _a !== void 0 ? _a : this._findByGlyph()) !== null && _b !== void 0 ? _b : this._findByNumber()) !== null && _c !== void 0 ? _c : new HashUTF8ToLtXConverter().convert(this._value);
  }
  _findByCharacter() {
    return ownLookup(allMathOperatorsByChar, this._value);
  }
  _findByGlyph() {
    return ownLookup(allMathOperatorsByGlyph, this._value);
  }
  _findByNumber() {
    return ownLookup(mathNumberByGlyph, this._value);
  }
};
var MO = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const normalizedValue = normalizeWhiteSpaces(this._mathmlElement.value);
    const trimmedValue = normalizedValue.trim();
    return Operator.operate(trimmedValue);
  }
};
var MN = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const normalizedValue = normalizeWhiteSpaces(this._mathmlElement.value).trim();
    const convertedValue = ownLookup(mathNumberByGlyph, normalizedValue);
    return convertedValue || normalizedValue;
  }
};
var MSqrt = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const latexJoinedChildren = this._mathmlElement.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" ");
    return `\\sqrt{${latexJoinedChildren}}`;
  }
};
var Vector = class {
  constructor(open, close, separators, defaultSeparator) {
    this.separators = separators;
    this.defaultSeparator = defaultSeparator;
    this.open = open || "(";
    this.close = close || ")";
  }
  apply(latexContents) {
    const contentWithoutWrapper = JoinWithManySeparators.join(latexContents, this.separators, this.defaultSeparator);
    return new GenericWrapper(this.open, this.close).wrap(contentWithoutWrapper);
  }
};
var Separators = class {
  constructor(open, close) {
    this.open = open;
    this.close = close;
  }
  wrap(str) {
    return new GenericWrapper(this.open, this.close).wrap(str);
  }
  areParentheses() {
    return this._compare("(", ")");
  }
  areSquareBrackets() {
    return this._compare("[", "]");
  }
  areBrackets() {
    return this._compare("{", "}");
  }
  areDivides() {
    return this._compare("|", "|");
  }
  areParallels() {
    return this.open === this.close && doubleBarFenceGlyphs.has(this.open);
  }
  areNotEqual() {
    return this.open !== this.close;
  }
  _compare(openToCompare, closeToCompare) {
    return this.open === openToCompare && this.close === closeToCompare;
  }
};
var Matrix = class {
  constructor(open, close) {
    this._genericCommand = "matrix";
    this.separators = new Separators(open, close);
  }
  apply(latexContents) {
    const command = this._command;
    const matrix = `\\begin{${command}}
${latexContents.join("")}
\\end{${command}}`;
    return command === this._genericCommand ? this.separators.wrap(matrix) : matrix;
  }
  get _command() {
    if (this.separators.areParentheses())
      return "pmatrix";
    if (this.separators.areSquareBrackets())
      return "bmatrix";
    if (this.separators.areBrackets())
      return "Bmatrix";
    if (this.separators.areDivides())
      return "vmatrix";
    if (this.separators.areParallels())
      return "Vmatrix";
    if (this.separators.areNotEqual())
      return this._genericCommand;
    return "bmatrix";
  }
};
var MFenced = class {
  constructor(mathmlElement) {
    this._mathmlElement = mathmlElement;
    this.open = this._mathmlElement.attributes.open || "";
    this.close = this._mathmlElement.attributes.close || "";
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const latexChildren = this._mathmlElement.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert());
    if (this._isThereRelativeOfName(this._mathmlElement.children, "mtable"))
      return new Matrix(this.open, this.close).apply(latexChildren);
    const separatorsAttr = this._mathmlElement.attributes.separators;
    const hasSeparatorsAttribute = separatorsAttr !== void 0;
    const separatorsArray = separatorsAttr ? Array.from(separatorsAttr) : [];
    const defaultSeparator = !hasSeparatorsAttribute ? "," : "";
    return new Vector(this.open, this.close, separatorsArray, defaultSeparator).apply(latexChildren);
  }
  /** Depth-first searches the subtree for any descendant element with the given name. */
  _isThereRelativeOfName(mathmlElements, elementName) {
    var _a;
    const stack = [...mathmlElements];
    while (stack.length > 0) {
      const element = stack.pop();
      if (element.name === elementName)
        return true;
      stack.push(...(_a = element.children) !== null && _a !== void 0 ? _a : []);
    }
    return false;
  }
};
var InvalidNumberOfChildrenError = class extends Error {
  /**
   * @param tagName - the offending element's tag name.
   * @param expectedNumberOfChild - the number of children the converter expects.
   * @param currentNumberOfChild - the number of children actually present.
   * @param comparison - how to read the expectation (e.g. `exactly`, `at least`).
   */
  constructor(tagName, expectedNumberOfChild, currentNumberOfChild, comparison = "exactly") {
    super(`${tagName} tag must have ${comparison} ${expectedNumberOfChild} children. It's actually ${currentNumberOfChild}`);
    this.name = "InvalidNumberOfChildrenError";
  }
};
var LineThickness = class {
  constructor(raw) {
    this._raw = raw;
  }
  /**
   * @returns the LaTeX dimension to use as the fraction bar thickness, or `null`
   * to keep the default-thickness `\frac` bar.
   */
  toLaTeX() {
    if (!this._raw)
      return null;
    const value = this._raw.trim().toLowerCase();
    if (value === "medium")
      return null;
    if (value === "thin")
      return formatPoints(DEFAULT_RULE_THICKNESS_PT * 0.5);
    if (value === "thick")
      return formatPoints(DEFAULT_RULE_THICKNESS_PT * 2);
    const match = value.match(/^(-?\d*\.?\d+)\s*([a-z%]*)$/);
    if (!match)
      return null;
    const amount = parseFloat(match[1]);
    const unit = match[2];
    if (amount === 0)
      return "0pt";
    if (unit === "")
      return amount === 1 ? null : formatPoints(amount * DEFAULT_RULE_THICKNESS_PT);
    if (unit === "px")
      return formatPoints(amount * PT_PER_PX);
    if (unit === "%")
      return formatPoints(amount / 100 * DEFAULT_RULE_THICKNESS_PT);
    if (TEX_LENGTH_UNITS.includes(unit))
      return `${amount}${unit}`;
    return null;
  }
};
var DEFAULT_RULE_THICKNESS_PT = 0.4;
var PT_PER_PX = 0.75;
var TEX_LENGTH_UNITS = ["pt", "pc", "in", "cm", "mm", "em", "ex", "bp", "dd", "cc"];
function formatPoints(valuePt) {
  return `${Math.round(valuePt * 1e4) / 1e4}pt`;
}
var MFrac = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   * @throws {InvalidNumberOfChildrenError} if the element does not have exactly 2 children.
   */
  convert() {
    const { children, name } = this._mathmlElement;
    const childrenLength = children.length;
    if (childrenLength !== 2)
      throw new InvalidNumberOfChildrenError(name, 2, childrenLength);
    const num = mathMLElementToLaTeXConverter(children[0]).convert();
    const den = mathMLElementToLaTeXConverter(children[1]).convert();
    if (this._isBevelled())
      return `${this._wrapIfMoreThanOneChar(num)}/${this._wrapIfMoreThanOneChar(den)}`;
    const thickness = new LineThickness(this._mathmlElement.attributes.linethickness).toLaTeX();
    if (thickness !== null)
      return `\\genfrac{}{}{${thickness}}{}{${num}}{${den}}`;
    return `\\frac{${num}}{${den}}`;
  }
  /** Wraps the bevelled-fraction side in parentheses when it is longer than one character. */
  _wrapIfMoreThanOneChar(str) {
    return new ParenthesisWrapper().wrapIfMoreThanOneChar(str);
  }
  /** Whether the `bevelled` attribute requests the inline `a/b` form. */
  _isBevelled() {
    return !!this._mathmlElement.attributes.bevelled;
  }
};
var MRoot = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   * @throws {InvalidNumberOfChildrenError} if the element does not have exactly 2 children.
   */
  convert() {
    const { name, children } = this._mathmlElement;
    const childrenLength = children.length;
    if (childrenLength !== 2)
      throw new InvalidNumberOfChildrenError(name, 2, childrenLength);
    const content = mathMLElementToLaTeXConverter(children[0]).convert();
    const rootIndex = mathMLElementToLaTeXConverter(children[1]).convert();
    return `\\sqrt[${rootIndex}]{${content}}`;
  }
};
var MAction = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const { children } = this._mathmlElement;
    if (this._isToggle())
      return children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" \\Longrightarrow ");
    return mathMLElementToLaTeXConverter(children[0]).convert();
  }
  /** True when the action is a toggle, i.e. `actiontype` is 'toggle' or unset. */
  _isToggle() {
    const { actiontype } = this._mathmlElement.attributes;
    return actiontype === "toggle" || !actiontype;
  }
};
var MEnclose = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const latexJoinedChildren = this._mathmlElement.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" ");
    if (this._notation === "actuarial")
      return `\\overline{\\left.${latexJoinedChildren}\\right|}`;
    if (this._notation === "radical")
      return `\\sqrt{${latexJoinedChildren}}`;
    if (["box", "roundedbox", "circle"].includes(this._notation))
      return `\\boxed{${latexJoinedChildren}}`;
    if (this._notation === "left")
      return `\\left|${latexJoinedChildren}`;
    if (this._notation === "right")
      return `${latexJoinedChildren}\\right|`;
    if (this._notation === "top")
      return `\\overline{${latexJoinedChildren}}`;
    if (this._notation === "bottom")
      return `\\underline{${latexJoinedChildren}}`;
    if (this._notation === "updiagonalstrike")
      return `\\cancel{${latexJoinedChildren}}`;
    if (this._notation === "downdiagonalstrike")
      return `\\bcancel{${latexJoinedChildren}}`;
    if (this._notation === "updiagonalarrow")
      return `\\cancelto{}{${latexJoinedChildren}}`;
    if (["verticalstrike", "horizontalstrike"].includes(this._notation))
      return `\\hcancel{${latexJoinedChildren}}`;
    if (this._notation === "madruwb")
      return `\\underline{${latexJoinedChildren}\\right|}`;
    if (this._notation === "phasorangle")
      return `{\\angle \\underline{${latexJoinedChildren}}}`;
    return `\\overline{\\left.\\right)${latexJoinedChildren}}`;
  }
  /** Returns the `notation` attribute, defaulting to 'longdiv'. */
  get _notation() {
    return this._mathmlElement.attributes.notation || "longdiv";
  }
};
var MError = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const latexJoinedChildren = this._mathmlElement.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" ");
    return `\\color{red}{${latexJoinedChildren}}`;
  }
};
var MPhantom = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    return "";
  }
};
var MSup = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   * @throws {InvalidNumberOfChildrenError} if the element does not have exactly 2 children.
   */
  convert() {
    const { name, children } = this._mathmlElement;
    const childrenLength = children.length;
    if (childrenLength !== 2)
      throw new InvalidNumberOfChildrenError(name, 2, childrenLength);
    const baseChild = children[0];
    const exponentChild = children[1];
    return `${this._handleBaseChild(baseChild)}^${this._handleExponentChild(exponentChild)}`;
  }
  /** Converts the base, parenthesizing it when it groups more than one child. */
  _handleBaseChild(base) {
    const baseChildren = base.children;
    const baseStr = mathMLElementToLaTeXConverter(base).convert();
    if (baseChildren.length <= 1) {
      return baseStr;
    }
    return new ParenthesisWrapper().wrapIfMoreThanOneChar(baseStr);
  }
  /** Converts the exponent and wraps it in braces. */
  _handleExponentChild(exponent) {
    const exponentStr = mathMLElementToLaTeXConverter(exponent).convert();
    return new BracketWrapper().wrap(exponentStr);
  }
};
var MSub = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   * @throws {InvalidNumberOfChildrenError} if the element does not have exactly 2 children.
   */
  convert() {
    const { name, children } = this._mathmlElement;
    const childrenLength = children.length;
    if (childrenLength !== 2)
      throw new InvalidNumberOfChildrenError(name, 2, childrenLength);
    const baseChild = children[0];
    const subscriptChild = children[1];
    return `${this._handleBaseChild(baseChild)}_${this._handleSubscriptChild(subscriptChild)}`;
  }
  /** Converts the base, parenthesizing it when it groups more than one child. */
  _handleBaseChild(base) {
    const baseChildren = base.children;
    const baseStr = mathMLElementToLaTeXConverter(base).convert();
    if (baseChildren.length <= 1) {
      return baseStr;
    }
    return new ParenthesisWrapper().wrapIfMoreThanOneChar(baseStr);
  }
  /** Converts the subscript and wraps it in braces. */
  _handleSubscriptChild(subscript) {
    const subscriptStr = mathMLElementToLaTeXConverter(subscript).convert();
    return new BracketWrapper().wrap(subscriptStr);
  }
};
var MSubsup = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   * @throws {InvalidNumberOfChildrenError} if the element does not have exactly 3 children.
   */
  convert() {
    const { name, children } = this._mathmlElement;
    const childrenLength = children.length;
    if (childrenLength !== 3)
      throw new InvalidNumberOfChildrenError(name, 3, childrenLength);
    const baseChild = children[0];
    const subscriptChild = children[1];
    const superscriptChild = children[2];
    return `${this._handleBaseChild(baseChild)}_${this._handleSubscriptChild(subscriptChild)}^${this._handleSuperscriptChild(superscriptChild)}`;
  }
  /** Converts the base, parenthesizing it when it groups more than one child. */
  _handleBaseChild(base) {
    const baseChildren = base.children;
    const baseStr = mathMLElementToLaTeXConverter(base).convert();
    if (baseChildren.length <= 1) {
      return baseStr;
    }
    return new ParenthesisWrapper().wrapIfMoreThanOneChar(baseStr);
  }
  /** Converts the subscript and wraps it in braces. */
  _handleSubscriptChild(subscript) {
    const subscriptStr = mathMLElementToLaTeXConverter(subscript).convert();
    return new BracketWrapper().wrap(subscriptStr);
  }
  /** Converts the superscript and wraps it in braces. */
  _handleSuperscriptChild(superscript) {
    const superscriptStr = mathMLElementToLaTeXConverter(superscript).convert();
    return new BracketWrapper().wrap(superscriptStr);
  }
};
var MMultiscripts = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   * @throws {InvalidNumberOfChildrenError} when the base child is missing.
   */
  convert() {
    const { name, children } = this._mathmlElement;
    if (children.length === 0)
      throw new InvalidNumberOfChildrenError(name, 1, 0, "at least");
    const base = this._baseLatex(children[0]);
    const { prescripts, postscripts } = this._splitScripts(children.slice(1));
    return this._pairsLatex(prescripts, true) + base + this._pairsLatex(postscripts, false);
  }
  /**
   * Converts the base, grouping a multi-token result with braces so the
   * scripts attach to all of it (and never collide with the base's own
   * scripts, e.g. a `msub` base). An empty base becomes an empty atom so the
   * surrounding scripts still have something valid to attach to.
   */
  _baseLatex(base) {
    const latex = mathMLElementToLaTeXConverter(base).convert();
    if (latex === "")
      return "{}";
    return latex.length === 1 ? latex : `{${latex}}`;
  }
  /** Splits the script children at the `<mprescripts/>` marker, wherever it is. */
  _splitScripts(scripts) {
    const markerIndex = scripts.findIndex((child) => child.name === "mprescripts");
    const postscripts = markerIndex === -1 ? scripts : scripts.slice(0, markerIndex);
    const prescripts = markerIndex === -1 ? [] : scripts.slice(markerIndex + 1);
    return { prescripts: this._toPairs(prescripts), postscripts: this._toPairs(postscripts) };
  }
  _toPairs(elements) {
    const pairs = [];
    for (let i = 0; i < elements.length; i += 2) {
      pairs.push({ sub: this._scriptLatex(elements[i]), sup: this._scriptLatex(elements[i + 1]) });
    }
    return pairs;
  }
  /** `<none/>` placeholders and missing trailing scripts become empty scripts. */
  _scriptLatex(element) {
    if (element === void 0 || element.name === "none")
      return "";
    return mathMLElementToLaTeXConverter(element).convert();
  }
  /**
   * Renders the pairs. Prescript pairs always hang off their own empty `{}`
   * atom; the first postscript pair attaches straight to the base and every
   * following pair gets a `{}` atom, which is what prevents double-subscript
   * errors. Fully empty pairs have no LaTeX representation and are skipped.
   */
  _pairsLatex(pairs, isPrescript) {
    let latex = "";
    let attachesToBase = !isPrescript;
    for (const pair of pairs) {
      const scripts = (pair.sub ? `_{${pair.sub}}` : "") + (pair.sup ? `^{${pair.sup}}` : "");
      if (scripts === "")
        continue;
      latex += (attachesToBase ? "" : "{}") + scripts;
      attachesToBase = false;
    }
    return latex;
  }
};
var TextCommand = class {
  constructor(mathvariant) {
    this._mathvariant = mathvariant || "normal";
  }
  apply(value) {
    return this._commands.reduce((acc, command, index) => {
      if (index === 0)
        return `${command}{${value}}`;
      return `${command}{${acc}}`;
    }, "");
  }
  get _commands() {
    switch (this._mathvariant) {
      case "bold":
        return ["\\textbf"];
      case "italic":
        return ["\\textit"];
      case "bold-italic":
        return ["\\textit", "\\textbf"];
      case "double-struck":
        return ["\\mathbb"];
      case "monospace":
        return ["\\mathtt"];
      case "bold-fraktur":
      case "fraktur":
        return ["\\mathfrak"];
      default:
        return ["\\text"];
    }
  }
};
var MText = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const { attributes, value } = this._mathmlElement;
    return [...value].map((char) => {
      if (/^[a-zA-Z0-9]$/.test(char) || char === " ")
        return {
          value: char,
          isAlphanumeric: true
        };
      return {
        value: char,
        isAlphanumeric: false
      };
    }).reduce((acc, char) => {
      if (char.isAlphanumeric) {
        const lastChar = acc[acc.length - 1];
        if (lastChar && lastChar.isAlphanumeric) {
          lastChar.value += char.value;
          return acc;
        }
      }
      return [...acc, char];
    }, []).map((char) => {
      if (!char.isAlphanumeric) {
        return new MI({
          name: "mi",
          attributes: {},
          children: [],
          value: char.value
        }).convert();
      }
      return new TextCommand(attributes.mathvariant).apply(char.value);
    }).join("");
  }
};
var MUnderover = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   * @throws {InvalidNumberOfChildrenError} if the element does not have exactly 3 children.
   */
  convert() {
    const { name, children } = this._mathmlElement;
    const childrenLength = children.length;
    if (childrenLength !== 3)
      throw new InvalidNumberOfChildrenError(name, 3, childrenLength);
    const base = mathMLElementToLaTeXConverter(children[0]).convert();
    const underContent = mathMLElementToLaTeXConverter(children[1]).convert();
    const overContent = mathMLElementToLaTeXConverter(children[2]).convert();
    return `${base}_{${underContent}}^{${overContent}}`;
  }
};
var EquationAlignment = class _EquationAlignment {
  constructor(table) {
    this._table = table;
  }
  /** @returns true when the table declares mixed right/left column alignment. */
  static matches(table) {
    return new _EquationAlignment(table)._matches();
  }
  _matches() {
    const tokens = new Set(this._columnAlignTokens());
    return tokens.has("right") && tokens.has("left");
  }
  _columnAlignTokens() {
    const rows = this._rows();
    const cells = rows.reduce((acc, row) => acc.concat(this._cells(row)), []);
    return [this._table, ...rows, ...cells].map((element) => element.attributes.columnalign).filter((value) => !!value).reduce((acc, value) => acc.concat(value.trim().split(/\s+/)), []);
  }
  _rows() {
    return this._table.children.filter((child) => child.name === "mtr");
  }
  _cells(row) {
    return row.children.filter((child) => child.name === "mtd");
  }
};
var MTable = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const tableContent = this._mathmlElement.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" \\\\\n");
    if (this._hasFlag("innerTable"))
      return this._wrap(tableContent, "matrix");
    if (this._hasFlag("bareTable")) {
      return this._wrap(tableContent, EquationAlignment.matches(this._mathmlElement) ? "aligned" : "matrix");
    }
    return tableContent;
  }
  /** Wraps the rows in the given LaTeX environment. */
  _wrap(latex, environment) {
    return `\\begin{${environment}}${latex}\\end{${environment}}`;
  }
  /** Checks whether the given boolean flag attribute is present and truthy. */
  _hasFlag(flag) {
    return !!this._mathmlElement.attributes[flag];
  }
};
var MTr = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const row = this._mathmlElement.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" & ");
    return this._mathmlElement.attributes["bareRow"] ? `\\begin{matrix}${row}\\end{matrix}` : row;
  }
};
var GenericSpacingWrapper = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    return this._mathmlElement.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" ");
  }
};
var UnderOverSetter = class {
  constructor(type) {
    this._type = type;
  }
  apply(content, accent) {
    return latexAccents.includes(accent) ? `${accent}{${content}}` : `${this._defaultCommand}{${accent}}{${content}}`;
  }
  get _defaultCommand() {
    if (this._type === TagTypes.Under)
      return "\\underset";
    return "\\overset";
  }
};
var TagTypes;
(function(TagTypes2) {
  TagTypes2[TagTypes2["Under"] = 0] = "Under";
  TagTypes2[TagTypes2["Over"] = 1] = "Over";
})(TagTypes || (TagTypes = {}));
var GenericUnderOver = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   * @throws {InvalidNumberOfChildrenError} when the element does not have exactly 2 children.
   */
  convert() {
    const { name, children } = this._mathmlElement;
    const childrenLength = children.length;
    if (childrenLength !== 2)
      throw new InvalidNumberOfChildrenError(name, 2, childrenLength);
    const content = mathMLElementToLaTeXConverter(children[0]).convert();
    const accent = mathMLElementToLaTeXConverter(children[1]).convert();
    return this._applyCommand(content, accent);
  }
  /** Chooses the under/over command based on the element name and applies it to the content and accent. */
  _applyCommand(content, accent) {
    const type = this._mathmlElement.name.match(/under/) ? TagTypes.Under : TagTypes.Over;
    return new UnderOverSetter(type).apply(content, accent);
  }
};
var LinearSystemPattern = class _LinearSystemPattern {
  constructor(element) {
    this._element = element;
  }
  /** @returns true when the element matches the pattern. */
  static matches(element) {
    return new _LinearSystemPattern(element)._matches();
  }
  _matches() {
    var _a;
    if (this._element.name !== "mrow")
      return false;
    const children = (_a = this._element.children) !== null && _a !== void 0 ? _a : [];
    if (children.length !== 2 && children.length !== 3)
      return false;
    return this._isOpeningBrace(children[0]) && this._isTable(children[1]) && this._isEmptyClosing(children[2]);
  }
  _isOpeningBrace(child) {
    return child.name === "mo" && child.value.trim() === "{";
  }
  _isTable(child) {
    return child.name === "mtable";
  }
  _isEmptyClosing(child) {
    return child === void 0 || child.name === "mo" && child.value.trim() === "";
  }
};
var MRow = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    if (LinearSystemPattern.matches(this._mathmlElement)) {
      return this._convertAsLinearSystem();
    }
    return this._mathmlElement.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" ");
  }
  /** Renders the inner `<mtable>` rows as a LaTeX `cases` environment. */
  _convertAsLinearSystem() {
    const mtableChild = this._mathmlElement.children[1];
    const tableContent = mtableChild.children.map((child) => mathMLElementToLaTeXConverter(child)).map((converter) => converter.convert()).join(" \\\\ ");
    return `\\begin{cases} ${tableContent} \\end{cases}`;
  }
};
var MSpace = class {
  constructor(mathElement) {
    this._mathmlElement = mathElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    const { linebreak } = this._mathmlElement.attributes;
    if (linebreak === "newline") {
      return " \\\\ ";
    }
    return " ";
  }
};
var Void = class {
  constructor(_mathmlElement) {
    this._mathmlElement = _mathmlElement;
  }
  /**
   * @returns the LaTeX representation of this element.
   */
  convert() {
    return "";
  }
};
var VoidMathMLElement = class {
  constructor() {
    this.name = "void";
    this.value = "";
    this.children = [];
    this.attributes = {};
  }
};
var MathMLElementToLatexConverterAdapter = class {
  constructor(mathMLElement) {
    this._mathMLElement = mathMLElement !== null && mathMLElement !== void 0 ? mathMLElement : new VoidMathMLElement();
  }
  /** @returns a converter instance bound to the wrapped element. */
  toLatexConverter() {
    const { name } = this._mathMLElement;
    const Converter = fromMathMLElementToLatexConverter[name] || GenericSpacingWrapper;
    return new Converter(this._mathMLElement);
  }
};
var fromMathMLElementToLatexConverter = {
  math: Math$1,
  mi: MI,
  mo: MO,
  mn: MN,
  msqrt: MSqrt,
  mfenced: MFenced,
  mfrac: MFrac,
  mroot: MRoot,
  maction: MAction,
  menclose: MEnclose,
  merror: MError,
  mphantom: MPhantom,
  msup: MSup,
  msub: MSub,
  msubsup: MSubsup,
  mmultiscripts: MMultiscripts,
  mtext: MText,
  munderover: MUnderover,
  mtable: MTable,
  mtr: MTr,
  mover: GenericUnderOver,
  munder: GenericUnderOver,
  mrow: MRow,
  mspace: MSpace,
  mpadded: GenericSpacingWrapper,
  void: Void
};
var FenceNormalizer = class {
  constructor(root) {
    this._root = root;
  }
  /** Rewrites the subtree in place, pairing sibling fence operators into `<mfenced>`. */
  normalize() {
    const stack = [this._root];
    while (stack.length > 0) {
      const node = stack.pop();
      const children = node.children;
      if (!children || children.length === 0)
        continue;
      const paired = new FencePairing(children).pair();
      if (paired !== children)
        children.splice(0, children.length, ...paired);
      for (const child of children)
        stack.push(child);
    }
  }
};
var FencePairing = class {
  constructor(children) {
    this._children = children;
  }
  /**
   * @returns a rewritten list with each matched pair nested into an `<mfenced>`,
   * or the original list (same reference) when nothing pairs.
   *
   * Single left-to-right pass: an opener starts a frame that collects its
   * content, a closer turns the innermost open frame into an `<mfenced>`, and any
   * frame still open at the end (an unmatched opener) is spilled back so it stays
   * a plain self-balanced delimiter. No recursion and no per-pop copying, so it
   * stays `O(n)` even for deeply nested or unbalanced input.
   */
  pair() {
    const root = [];
    const openFrames = [];
    let current = root;
    let paired = false;
    for (const child of this._children) {
      const top = openFrames[openFrames.length - 1];
      if (this._opensFrame(child, top)) {
        const frame = { opener: child, content: [] };
        openFrames.push(frame);
        current = frame.content;
        continue;
      }
      if (this._closesFrame(child, top)) {
        const frame = openFrames.pop();
        current = openFrames.length > 0 ? openFrames[openFrames.length - 1].content : root;
        current.push(this._makeFence(frame.opener, child, frame.content));
        paired = true;
        continue;
      }
      const scriptCloser = this._scriptBaseCloser(child, top);
      if (scriptCloser !== void 0) {
        const frame = openFrames.pop();
        current = openFrames.length > 0 ? openFrames[openFrames.length - 1].content : root;
        const fence = this._makeFence(frame.opener, scriptCloser, frame.content);
        current.push(Object.assign(Object.assign({}, child), { children: [fence, ...child.children.slice(1)] }));
        paired = true;
        continue;
      }
      current.push(child);
    }
    if (!paired)
      return this._children;
    for (const frame of openFrames)
      this._spill(frame, root);
    return root;
  }
  /** Spills an unmatched opener and its collected content back into the result, keeping source order. */
  _spill(frame, target) {
    target.push(frame.opener);
    for (const node of frame.content)
      target.push(node);
  }
  /** Builds an `<mfenced>` around the paired content, passing a lone child directly to preserve matrix mode. */
  _makeFence(opener, closer, content) {
    return {
      name: "mfenced",
      value: "",
      children: [content.length === 1 ? content[0] : this._wrapInRow(content)],
      attributes: { open: opener.value.trim(), close: closer.value.trim() }
    };
  }
  /** Wraps several nodes in a single `<mrow>` so `<mfenced>` does not insert separators between them. */
  _wrapInRow(children) {
    return { name: "mrow", value: "", children, attributes: {} };
  }
  /**
   * Detects the closing bar of a scripted norm, the shape editors emit for
   * `‖P‖_F^2`: a script element whose base holds only the bar that matches the
   * open bar frame (`<mo>∥</mo><mi>P</mi><msubsup><mrow><mo>∥</mo></mrow>F 2`,
   * issue #43). Without this, the nested closer is invisible to the sibling
   * pass and the opener would pair with the *next* norm's opener, fencing the
   * wrong span. The frame content becomes the fence and the script attaches to
   * it: `msubsup(mfenced(P), F, 2)`.
   *
   * @returns the matching bar, or undefined when the child is not this shape.
   */
  _scriptBaseCloser(child, top) {
    if (top === void 0 || !this._isBar(top.opener))
      return void 0;
    if (!SCRIPT_ELEMENTS.has(child.name) || child.children.length === 0)
      return void 0;
    const base = child.children[0];
    const bar = base.name === "mrow" && base.children.length === 1 ? base.children[0] : base;
    if (bar.name !== "mo" || bar.value.trim() !== top.opener.value.trim())
      return void 0;
    return bar;
  }
  /** A directional opener, or a vertical bar that does not close the current frame. */
  _opensFrame(child, top) {
    if (this._isOpener(child))
      return true;
    return this._isBar(child) && !this._closesBar(child, top);
  }
  /** A directional closer matching a directional frame, or a bar closing a same-glyph bar frame. */
  _closesFrame(child, top) {
    if (top === void 0)
      return false;
    if (this._isCloser(child) && this._isOpener(top.opener))
      return true;
    return this._closesBar(child, top);
  }
  /** Whether `child` is a bar that closes `top`, i.e. `top` is a bar frame opened by the same glyph. */
  _closesBar(child, top) {
    if (top === void 0 || !this._isBar(child) || !this._isBar(top.opener))
      return false;
    return top.opener.value.trim() === child.value.trim();
  }
  _isOpener(element) {
    return element.name === "mo" && OPENERS.has(element.value.trim());
  }
  _isCloser(element) {
    return element.name === "mo" && CLOSERS.has(element.value.trim());
  }
  _isBar(element) {
    return element.name === "mo" && BARS.has(element.value.trim());
  }
};
var OPENERS = /* @__PURE__ */ new Set(["(", "[", "{"]);
var CLOSERS = /* @__PURE__ */ new Set([")", "]", "}"]);
var BARS = /* @__PURE__ */ new Set(["|", ...doubleBarFenceGlyphs]);
var SCRIPT_ELEMENTS = /* @__PURE__ */ new Set(["msub", "msup", "msubsup"]);
var TableAnnotator = class {
  constructor(root) {
    this._root = root;
  }
  /** Walks the tree and stamps the wrapper flags in place. */
  normalize() {
    const stack = [{ node: this._root, insideMtable: false, wrapped: false }];
    while (stack.length > 0) {
      const frame = stack.pop();
      this._annotate(frame);
      this._pushChildren(frame, stack);
    }
  }
  _annotate({ node, insideMtable, wrapped }) {
    if (node.name === "mtable") {
      if (insideMtable)
        node.attributes["innerTable"] = "innerTable";
      else if (!wrapped)
        node.attributes["bareTable"] = "bareTable";
    }
    if (node.name === "mtr" && !insideMtable)
      node.attributes["bareRow"] = "bareRow";
  }
  _pushChildren({ node, insideMtable, wrapped }, stack) {
    var _a;
    const childInsideMtable = insideMtable || node.name === "mtable";
    const childWrapped = wrapped || node.name === "mfenced";
    const linearSystemTable = LinearSystemPattern.matches(node) ? node.children[1] : void 0;
    const children = (_a = node.children) !== null && _a !== void 0 ? _a : [];
    for (let i = 0; i < children.length; i++) {
      stack.push({
        node: children[i],
        insideMtable: childInsideMtable,
        wrapped: childWrapped || children[i] === linearSystemTable
      });
    }
  }
};
var convertTreeToLatex = (root) => {
  var _a, _b;
  for (const normalizer of makeTreeNormalizers(root))
    normalizer.normalize();
  const memo = /* @__PURE__ */ new Map();
  const stack = [{ node: root, visited: false }];
  const previousMemo = setConversionMemo(memo);
  try {
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (!frame.visited) {
        frame.visited = true;
        const children = (_a = frame.node.children) !== null && _a !== void 0 ? _a : [];
        for (let i = children.length - 1; i >= 0; i--)
          stack.push({ node: children[i], visited: false });
        continue;
      }
      stack.pop();
      memo.set(frame.node, new MathMLElementToLatexConverterAdapter(frame.node).toLatexConverter().convert());
    }
  } finally {
    setConversionMemo(previousMemo);
  }
  return (_b = memo.get(root)) !== null && _b !== void 0 ? _b : "";
};
var makeTreeNormalizers = (root) => [
  new FenceNormalizer(root),
  new TableAnnotator(root)
];
var XmlToMathMLAdapter = class {
  constructor(elementsConvertor, errorHandler) {
    this._xml = "";
    this._elementsConvertor = elementsConvertor;
    this._errorHandler = errorHandler;
    this._xmlDOM = new DOMParser({
      onError: (_level, message) => this._fixError(message)
    });
  }
  /**
   * Parses the given markup and returns its `<math>` elements as trees.
   *
   * @param xml - the MathML/XML markup to parse.
   * @returns one {@link MathMLElement} tree per `<math>` element found.
   */
  convert(xml) {
    this._xml = this._removeLineBreaks(xml);
    this._xml = this._removeMsWordPrefixes(this._xml);
    return this._elementsConvertor.convert(this._mathMLElements);
  }
  _fixError(errorMessage) {
    this._xml = this._errorHandler.fixError(this._xml, errorMessage);
  }
  _removeLineBreaks(xml) {
    const LINE_BREAK = /\n|\r\n|\r/g;
    return xml.replace(LINE_BREAK, "");
  }
  _removeMsWordPrefixes(xml) {
    const MS_WORD_PREFIX = /mml:/g;
    return xml.replace(MS_WORD_PREFIX, "");
  }
  get _mathMLElements() {
    let document = this._parse();
    if (this._errorHandler.isThereAnyErrors()) {
      this._errorHandler.cleanErrors();
      document = this._parse();
    }
    const elements = document === null || document === void 0 ? void 0 : document.getElementsByTagName("math");
    return elements ? Array.from(elements) : [];
  }
  _parse() {
    try {
      return this._xmlDOM.parseFromString(this._xml, "text/xml");
    } catch (_a) {
      return void 0;
    }
  }
};
var ErrorHandler = class {
  constructor() {
    this._errors = [];
  }
  /**
   * If the parser error is a recoverable missing-attribute-value error, records
   * it and returns the XML with the offending attribute stripped; otherwise
   * returns the XML unchanged.
   *
   * @param xml - the current (possibly malformed) XML.
   * @param errorMessage - the message reported by the parser.
   * @returns the (possibly corrected) XML.
   */
  fixError(xml, errorMessage) {
    if (!this._isMissingAttributeValueError(errorMessage))
      return xml;
    this._errors.push(errorMessage);
    return this._fixMissingAttribute(errorMessage, xml);
  }
  isThereAnyErrors() {
    return this._errors.length > 0;
  }
  cleanErrors() {
    this._errors = [];
  }
  _fixMissingAttribute(errorMessage, xml) {
    const missingAttribute = this._attributeNameFromError(errorMessage);
    if (missingAttribute)
      return xml.replace(this._matchMissingValueForAttribute(missingAttribute), "");
    while (this._mathGenericMissingValue().exec(xml)) {
      xml = xml.replace(this._mathGenericMissingValue(), "$1$3");
    }
    return xml;
  }
  // Only the "missed value" warning carries the offending attribute name. The
  // "AttValue: ' or \" expected" fatalError does not, so it falls back to the
  // generic strip above.
  _attributeNameFromError(errorMessage) {
    var _a;
    return (_a = errorMessage.match(/attribute "([^"]+)" missed value/)) === null || _a === void 0 ? void 0 : _a[1];
  }
  _matchMissingValueForAttribute(attribute) {
    return new RegExp(`(${attribute}=(?!("|')))|(${attribute}(?!("|')))`, "gm");
  }
  _mathGenericMissingValue() {
    return /(\<.* )(\w+=(?!\"|\'))(.*\>)/gm;
  }
  _isMissingAttributeValueError(errorMessage) {
    return !!errorMessage.includes("attribute") && !!errorMessage.includes("missed") || errorMessage.includes("attribute value missed") || // Since xmldom 0.9 a value-less attribute written as `attr=` is reported
    // as this fatalError instead of a recoverable warning.
    errorMessage.includes(`AttValue: ' or " expected`);
  }
};
var ElementsToMathMLAdapter = class {
  /**
   * Builds {@link MathMLElement} trees from the given DOM elements.
   *
   * @param els - the root DOM elements to convert (e.g. the `<math>` elements).
   * @returns the corresponding internal element trees, in document order.
   */
  convert(els) {
    const result = [];
    const stack = [];
    for (let i = els.length - 1; i >= 0; i--)
      stack.push({ el: els[i], target: result });
    while (stack.length > 0) {
      const { el, target } = stack.pop();
      if (el.tagName === void 0)
        continue;
      const node = this._convertElement(el);
      target.push(node);
      if (!this._hasElementChild(el))
        continue;
      const children = Array.from(el.childNodes);
      for (let i = children.length - 1; i >= 0; i--)
        stack.push({ el: children[i], target: node.children });
    }
    return result;
  }
  _convertElement(el) {
    return {
      name: el.tagName,
      attributes: this._convertElementAttributes(el.attributes),
      value: this._hasElementChild(el) ? "" : el.textContent || "",
      children: []
    };
  }
  _convertElementAttributes(attributes) {
    return Array.from(attributes).reduce((acc, attr) => Object.assign({ [attr.nodeName]: attr.nodeValue === attr.nodeName ? "" : attr.nodeValue }, acc), {});
  }
  _hasElementChild(el) {
    const childNodes = el.childNodes;
    return !!childNodes && childNodes.length !== 0 && this._isThereAnyNoTextNode(childNodes);
  }
  _isThereAnyNoTextNode(children) {
    return Array.from(children).some((child) => child.nodeName !== "#text");
  }
};
var makeToMathElementsConverter = () => {
  const elementsToMathMLAdapter = new ElementsToMathMLAdapter();
  const errorHandler = new ErrorHandler();
  return new XmlToMathMLAdapter(elementsToMathMLAdapter, errorHandler);
};
var MathMLToLaTeX = class {
  /**
   * Converts a MathML string to its LaTeX representation.
   *
   * @param mathml - the MathML markup to convert.
   * @returns the equivalent LaTeX string (trimmed).
   */
  static convert(mathml) {
    const mathmlElements = makeToMathElementsConverter().convert(mathml);
    return mathmlElements.map((mathMLElement) => convertTreeToLatex(mathMLElement)).join("").trim();
  }
};
export {
  MathMLToLaTeX
};

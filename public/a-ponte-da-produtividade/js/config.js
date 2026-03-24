(function() {
  'use strict';

  var cfg = {
    BW: 10,
    PL: 2.0,
    DIST: 1680,
    GSPACE: 24,
    NGATES: 60,
    ISPEED: 12,
    MSPEED: 30,
    ISTAKES: 20,
    gateGoodMin: Math.ceil(24 / 2.0),
    gateGoodRange: 12,
    gateBadMin: 5,
    gateBadRange: 10
  };

  PONTE.config = cfg;

  PONTE.PRODUCTS = [
    { name:'Verdavis', type:'Inseticida sistêmico', desc:'Controle de pulgões e tripes em aplicação foliar', fase:'V3–V6' },
    { name:'Actara', type:'Inseticida neonicotinoide', desc:'Ação translaminar contra sugadores na soja', fase:'V2–V5' },
    { name:'Ampligo', type:'Inseticida de contato', desc:'Controle de lagartas com dupla ação', fase:'V4–R2' },
    { name:'Cruiser', type:'Tratamento de sementes', desc:'Proteção inicial contra pragas do solo', fase:'Semente' },
    { name:'Fortenza', type:'Tratamento de sementes', desc:'Defesa de alto desempenho no plantio', fase:'Semente' },
    { name:'Maxim', type:'Fungicida para sementes', desc:'Proteção contra fungos de solo e sementes', fase:'Semente' },
    { name:'Plenus', type:'Herbicida seletivo', desc:'Controle de invasoras de folha larga', fase:'V2–V4' },
    { name:'Elatus', type:'Fungicida foliar', desc:'Máxima proteção contra ferrugem asiática', fase:'R1–R5' },
    { name:'Priori', type:'Fungicida sistêmico', desc:'Ação preventiva contra doenças foliares', fase:'V6–R3' },
    { name:'Avicta', type:'Nematicida biológico', desc:'Proteção contra nematoides na raiz', fase:'Semente' }
  ];

  PONTE.PESTS = [
    { name:'Ferrugem', type:'Fungo Phakopsora', desc:'Alta virulência em condições de alta umidade', fase:'R1–R5' },
    { name:'Lagarta', type:'Lepidoptera', desc:'Desfolha severa reduz potencial produtivo', fase:'V3–R5' },
    { name:'Percevejo', type:'Hemiptera sugador', desc:'Danos diretos em vagens e grãos', fase:'R3–R7' },
    { name:'Mosca-branca', type:'Bemisia tabaci', desc:'Transmissor de viroses na lavoura', fase:'V2–R5' },
    { name:'Nematoide', type:'Pratylenchus spp.', desc:'Redução do sistema radicular e vigor', fase:'Todo ciclo' },
    { name:'Mofo-branco', type:'Sclerotinia', desc:'Apodrecimento de hastes em clima úmido', fase:'R1–R4' },
    { name:'Cigarrinha', type:'Hemiptera saltador', desc:'Suga seiva e transmite patógenos', fase:'V2–V6' },
    { name:'Trips', type:'Thysanoptera', desc:'Raspagem foliar com prateamento', fase:'V1–V4' },
    { name:'Ácaro', type:'Tetranychidae', desc:'Descoloração foliar em clima seco', fase:'V4–R3' },
    { name:'Pulgão', type:'Aphididae sugador', desc:'Colônias causam encarquilhamento', fase:'V2–R2' }
  ];

  PONTE.FASES = ['V1','V2','V3','V4','V5','V6','R1','R2','R3','R4','R5','R6','R7'];

})();

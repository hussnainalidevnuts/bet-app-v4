// Simple utility to get Fotmob logo URL from Unibet league ID
// Based on league_mapping_clean.csv

const UNIBET_TO_FOTMOB_MAPPING = {
  '1000093381': '42', // Champions League
  '1000093399': '45', // Copa Libertadores
  '1000179126': '299', // Copa Sudamericana
  '2000069140': '10611', // Champions League Qualification
  '2000077426': '10613', // Europa League Qualification
  '2000130521': '10615', // Conference League Qualification
  '2000120032': '10043', // Leagues Cup
  '1000123032': '289', // African Nations Cup
  '1000094985': '47', // Premier League
  '1000094981': '48', // The Championship
  '1000094982': '108', // League One
  '1000094987': '109', // League Two
  '1000095485': '117', // National League
  '1000094984': '132', // FA Cup
  '1000094986': '133', // EFL Cup
  '1000095137': '142', // EFL Trophy
  '2000057364': '9428', // African Championship of Nations
  '1000094994': '54', // Bundesliga
  '1000094993': '146', // 2. Bundesliga
  '1000094995': '209', // DFB Pokal
  '1000353685': '8924', // DFL-Supercup
  '1000094991': '53', // Ligue 1
  '1000094568': '110', // Ligue 2
  '1000094990': '134', // Coupe de France
  '1000094825': '8970', // Championnat National
  '1000095001': '55', // Serie A
  '1000095002': '86', // Serie B
  '1000094998': '141', // Coppa Italia
  '1000094980': '57', // Eredivisie
  '1000095127': '111', // Eerste Divisie
  '1000094979': '235', // KNVB Beker
  '1000095042': '61', // Primeira Liga
  '1000265213': '185', // Liga 2
  '1000094978': '46', // Superligaen
  '1000094976': '85', // 1st Division
  '1000443738': '242', // DBU Pokalen
  '1000095010': '59', // Eliteserien
  '1000095003': '203', // OBOS-ligaen
  '1000176403': '331', // Toppserien (W)
  '1000094989': '51', // Veikkausliiga
  '1000094796': '251', // Ykkönen
  '2000050783': '10174', // Kansallinen Liiga (W)
  '1000095057': '67', // Allsvenskan
  '1000095052': '168', // Superettan
  '1000095020': '69', // Super League
  '1000095047': '64', // Scottish Premiership
  '1000095045': '123', // Championship
  '1000095046': '180', // League Cup
  '1000258091': '129', // NIFL Premiership
  '1000095049': '87', // La Liga
  '1000094708': '140', // La Liga 2
  '1000095050': '138', // Copa del Rey
  '1000094569': '268', // Brasileirao Serie A
  '1000094431': '8814', // Brasileirao Serie B
  '2000055538': '8971', // Brasileirao Serie C
  '2000059106': '9464', // Brasileirao Serie D
  '1000093998': '9067', // Copa do Brasil
  '2000050561': '112', // Liga Profesional Argentina
  '1000442572': '8965', // Primera B Nacional
  '2000087788': '9213', // Torneo Federal A
  '2000056748': '9305', // Copa Argentina
  '1000345237': '38', // Bundesliga (Austria)
  '1000094965': '40', // Jupiler Pro League
  '1000358593': '264', // Challenger Pro League
  '1000094961': '149', // Beker van Belgie
  '1000094975': '122', // First League
  '1000154221': '253', // National Football League
  '1000095645': '223', // J1-League
  '1000152623': '8974', // J2-League
  '2000067441': '9136', // J3-League
  '1000094112': '230', // Liga MX
  '1000451251': '8976', // Liga de Expansion MX
  '1000385219': '196', // Ekstraklasa
  '1000348167': '197', // I Liga
  '1000152705': '9080', // K-League 1
  '2000064655': '9116', // K-League 2
  '2000051288': '9537', // K-3 League
  '1000095062': '71', // Süper Lig
  '1000305993': '165', // 1. Lig
  '1000095063': '130', // MLS
  '2000074865': '9134', // NWSL (W)
  '2000055612': '8972', // USL Championship
  '1000095346': '248', // Premium Liiga
  '2000055068': '250', // Premier League (Faroe Islands)
  '2000050125': '116', // Premier League (Wales)
  '1000095713': '246', // Liga Pro
  '1000251645': '519', // Premier League (Egypt)
  '1000095155': '273', // Primera Chile
  '1000439335': '9126', // Primera B
  '1000338400': '120', // Super League (China)
  '1000449742': '274', // Liga Dimayor
  '2000050211': '9490', // Copa Dimayor
  '2000095699': '8983', // Liga 1 (Indonesia)
  '2000050580': '524', // Premier League (Jordan)
  '1000157714': '228', // A Lyga
  '2000050115': '199', // Primera Paraguay
  '1000237680': '131', // Liga 1 (Peru)
  '2000054001': '535', // Qatar Stars League
  '1000095499': '189', // Liga I
  '2000095935': '9113', // Liga II
  '1000250591': '536', // Professional League
  '2000050599': '182', // Super Liga
  '2000051365': '176', // 2. Liga
  '1000297434': '173', // Prva Liga
  '1000250636': '537', // SA Premier Soccer League
  '2000053119': '544', // Ligue 1 (Tunisia)
  '1000171537': '441', // Premier League (Ukraine)
  '1000450453': '161', // Campeonato Uruguayo
  '2000056865': '9122', // Segunda Division
  '2010203832': '9469', // AFC Champions League 2
  '2000051195': '73', // Europa League
  '2000121299': '10619', // CAF Champions League Qualification
  '2000130522': '10216', // Conference League
  '2010133908': '77', // World Cup 2026
  '2000086372': '10195', // World Cup Qualifying - Europe
  '2000052332': '9213', // Primera B Metropolitana
  '2000057542': '173', // Prva Liga (Bosnia-Herzegovina)
  '1000095736': '252', // 1. HNL League
  '2000117732': '10046', // Copa Ecuador
  '2000050126': '117', // National League North
  '1000385084': '117', // National League South
  '2000052405': '439', // Erovnuli Liga
  '1000355562': '208', // 3. Liga
  '1000094996': '135', // Super League (Greece)
  '2000052302': '9372', // Azadegan League
  '1000095601': '126', // Premier Division
  '2000079607': '147', // Serie C Girone A
  '2000079609': '147', // Serie C Girone C
  '1000158930': '226', // Virsliga
  '2000109034': '9906', // Liga MX Femenil (W)
  '2000050271': '530', // Botola
  '2000095410': '9195', // Tweede Divisie
  '2000116433': '10230', // Copa Paraguay
  '2000057675': '196', // Ekstraklasa (W)
  '2000077607': '8935', // II Liga
  '1000095016': '198', // Puchar Polski
  '1000280417': '124', // League One (Scotland)
  '1000280418': '125', // League Two (Scotland)
  '1000094254': '137', // Scottish Cup
  '1000315962': '461', // Singapore Premier League
  '1000095048': '182', // Super Liga (Slovakia)
  '2000051123': '10651', // Copa de la Reina (W)
  '2000075204': '10308', // Elitettan (W)
  '1000094744': '169', // Ettan Norra
  '1000094745': '169', // Ettan Södra
  '1000176396': '9089', // OBOS Damallsvenskan (W)
  '1000095021': '163', // Challenge League
  '2000076226': '9498', // Thai League 2
  '1000093570': '114', // International Friendly Matches
  '2000065880': '10437', // UEFA Championship Qualification U21
  '2000086369': '10198', // World Cup Qualifying - North, Central & Caribbean
  '2000054642': '8947', // Isthmian League Premier Division
  '2000054030': '8947', // Northern League Premier Division
  '2000052846': '8947', // Southern League Premier Division
  '2000066138': '10609', // AFC Asian Cup Qualification
  '1000383729': '256', // Elitedivisionen (W)
  // '1000094988': '9375', // Women's Championship
  '2000051466': '9375', // Women's Championship (alternative ID)
  '2010205606': '11129', // Europa Cup (W)
  
};

export const getFotmobLogoByUnibetId = (unibetId) => {
  if (!unibetId) {
    return null;
  }
  
  const fotmobId = UNIBET_TO_FOTMOB_MAPPING[String(unibetId)];
  
  if (!fotmobId) {
    return null;
  }
  
  const url = `https://images.fotmob.com/image_resources/logo/leaguelogo/${fotmobId}.png`;
  return url;
};

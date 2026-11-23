/**
 * 将「使徒时代」题库拆成中文 / 泰语 / 印尼语三套文案
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB = join(__dirname, '..', 'server', 'data', 'db.json')
const QUIZ_ID = 'd0d30204-cf25-430a-8cc0-b439f8eb9b8d'

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'th', label: 'ไทย' },
  { code: 'id', label: 'Indonesia' },
]

const questions = [
  // 1 choice — B
  {
    id: 'ap_q1',
    type: 'choice',
    timeLimit: 25,
    correctIndex: 1,
    locales: {
      zh: {
        text: '项目把使徒时代的起止定为：',
        options: [
          '主后 1–70 年',
          '主后 34–100 年',
          '主后 100–313 年',
          '主后 64–95 年',
        ],
      },
      th: {
        text: 'โครงการกำหนดช่วงเวลาของยุคอัครทูตไว้ว่า',
        options: ['ค.ศ. 1–70', 'ค.ศ. 34–100', 'ค.ศ. 100–313', 'ค.ศ. 64–95'],
      },
      id: {
        text: 'Proyek ini menetapkan Zaman Kerasulan berlangsung pada:',
        options: ['1–70 M', '34–100 M', '100–313 M', '64–95 M'],
      },
    },
  },
  // 2 choice — C
  {
    id: 'ap_q2',
    type: 'choice',
    timeLimit: 25,
    correctIndex: 2,
    locales: {
      zh: {
        text: '五旬节当天，彼得讲道之后约有多少人受洗归主？',
        options: ['一百二十人', '五百人', '三千人', '五千人'],
      },
      th: {
        text: 'ในวันเพ็นเทคอสต์ หลังเปโตรเทศนา มีผู้รับบัพติศมาประมาณกี่คน',
        options: ['หนึ่งร้อยยี่สิบคน', 'ห้าร้อยคน', 'สามพันคน', 'ห้าพันคน'],
      },
      id: {
        text: 'Pada hari Pentakosta, setelah khotbah Petrus, kira-kira berapa orang yang dibaptis?',
        options: [
          'seratus dua puluh orang',
          'lima ratus orang',
          'tiga ribu orang',
          'lima ribu orang',
        ],
      },
    },
  },
  // 3 choice — B
  {
    id: 'ap_q3',
    type: 'choice',
    timeLimit: 30,
    correctIndex: 1,
    locales: {
      zh: {
        text: '耶路撒冷会议（约主后 49 年）的主要结论是：',
        options: [
          '外邦人必须先受割礼，才能得救',
          '外邦人因信得救，不必先成为犹太人',
          '福音只向犹太人传',
          '教会总部迁到罗马',
        ],
      },
      th: {
        text: 'ข้อสรุปหลักของสภาเยรูซาเล็ม (ราว ค.ศ. 49) คือ',
        options: [
          'คนต่างชาติต้องเข้าสุหนัตก่อนจึงจะได้รับความรอด',
          'คนต่างชาติได้รับความรอดโดยความเชื่อ ไม่ต้องเป็นยิวก่อน',
          'ข่าวประเสริฐประกาศได้เฉพาะแก่ชาวยิว',
          'สำนักงานใหญ่ของคริสตจักรย้ายไปโรม',
        ],
      },
      id: {
        text: 'Kesimpulan utama Konsili Yerusalem (sekitar tahun 49 M) adalah:',
        options: [
          'Orang non-Yahudi harus disunat lebih dahulu agar selamat',
          'Orang non-Yahudi diselamatkan oleh iman, tanpa harus menjadi Yahudi lebih dahulu',
          'Injil hanya diberitakan kepada orang Yahudi',
          'Pusat gereja dipindahkan ke Roma',
        ],
      },
    },
  },
  // 4 choice — B
  {
    id: 'ap_q4',
    type: 'choice',
    timeLimit: 25,
    correctIndex: 1,
    locales: {
      zh: {
        text: '教会传统把使徒约翰被放逐拔摩岛，主要和哪一次逼迫连在一起？',
        options: [
          '尼禄（第一次）',
          '多米提安（第二次）',
          '图拉真（第三次）',
          '戴克里先大逼迫',
        ],
      },
      th: {
        text: 'ประเพณีคริสตจักรเชื่อมการที่อัครทูตยอห์นถูกเนรเทศไปเกาะปัทมอส กับการข่มเหงครั้งใดเป็นหลัก',
        options: [
          'เนโร (ครั้งที่หนึ่ง)',
          'โดมิเทียน (ครั้งที่สอง)',
          'ไตรอัน (ครั้งที่สาม)',
          'การข่มเหงครั้งใหญ่ของไดโอคลีเทียน',
        ],
      },
      id: {
        text: 'Tradisi gereja terutama menghubungkan pembuangan Rasul Yohanes ke pulau Patmos dengan penganiayaan yang mana?',
        options: [
          'Nero (yang pertama)',
          'Domitianus (yang kedua)',
          'Trajanus (yang ketiga)',
          'Penganiayaan Besar Diocletianus',
        ],
      },
    },
  },
  // 5 choice — B
  {
    id: 'ap_q5',
    type: 'choice',
    timeLimit: 30,
    correctIndex: 1,
    locales: {
      zh: {
        text: '初期三大宣教中心及其主要面向，哪一项对应正确？',
        options: [
          '耶路撒冷向外邦人，安提阿向犹太人，以弗所向罗马',
          '耶路撒冷向犹太人，安提阿向外邦人，以弗所为宣教与教导中心',
          '三处都只向犹太人传福音',
          '以弗所是教会诞生之地',
        ],
      },
      th: {
        text: 'ศูนย์พันธกิจสามแห่งยุคแรกกับกลุ่มคนที่แต่ละแห่งมุ่งไป ข้อใดถูกต้อง',
        options: [
          'เยรูซาเล็มสู่คนต่างชาติ อันทิโอกสู่ชาวยิว เอเฟซัสสู่โรม',
          'เยรูซาเล็มสู่ชาวยิว อันทิโอกสู่คนต่างชาติ เอเฟซัสเป็นศูนย์พันธกิจและการสอน',
          'ทั้งสามแห่งประกาศเฉพาะแก่ชาวยิว',
          'เอเฟซัสเป็นสถานที่ที่คริสตจักรกำเนิด',
        ],
      },
      id: {
        text: 'Manakah pasangan yang tepat untuk tiga pusat misi awal dan sasaran utamanya?',
        options: [
          'Yerusalem kepada bangsa-bangsa lain, Antiokhia kepada orang Yahudi, Efesus kepada Roma',
          'Yerusalem kepada orang Yahudi, Antiokhia kepada bangsa-bangsa lain, Efesus sebagai pusat misi dan pengajaran',
          'Ketiganya hanya memberitakan Injil kepada orang Yahudi',
          'Efesus adalah tempat kelahiran gereja',
        ],
      },
    },
  },
  // 6 fill
  {
    id: 'ap_q6',
    type: 'fill',
    timeLimit: 30,
    locales: {
      zh: {
        text: '教会首位殉道者是七执事之一的________；他被害后，门徒分散到犹太和撒玛利亚各处传道。',
        acceptAnswers: ['司提反', '斯提反', '司提芬'],
      },
      th: {
        text: 'มรณสักขีคนแรกของคริสตจักรคือ ________ หนึ่งในเจ็ดคน หลังท่านถูกฆ่า สาวกกระจัดกระจายไปประกาศทั่วแคว้นยูเดียและสะมาเรีย',
        acceptAnswers: ['สเทเฟน', 'สเตเฟน'],
      },
      id: {
        text: 'Martir pertama gereja adalah ________, salah seorang dari ketujuh orang itu. Setelah ia dibunuh, murid-murid tercerai-berai memberitakan Injil ke seluruh Yudea dan Samaria.',
        acceptAnswers: ['Stefanus', 'Stephen'],
      },
    },
  },
  // 7 fill
  {
    id: 'ap_q7',
    type: 'fill',
    timeLimit: 25,
    locales: {
      zh: {
        text: '扫罗在往________的路上遇见主，眼睛暂时失明，后由亚拿尼亚按手，受洗归主。',
        acceptAnswers: ['大马士革', '大馬士革'],
      },
      th: {
        text: 'เซาโลได้พบองค์พระผู้เป็นเจ้าบนทางไป ________ ตาบอดชั่วคราว ภายหลังอานาเนียวางมือ แล้วท่านรับบัพติศมา',
        acceptAnswers: ['ดามัสกัส', 'ดามาสกัส'],
      },
      id: {
        text: 'Saulus bertemu Tuhan di jalan menuju ________. Matanya menjadi buta untuk sementara, lalu Ananias menumpangkan tangan, dan ia dibaptis.',
        acceptAnswers: ['Damsyik', 'Damascus', 'Damaskus'],
      },
    },
  },
  // 8 fill
  {
    id: 'ap_q8',
    type: 'fill',
    timeLimit: 25,
    locales: {
      zh: {
        text: '信徒第一次被称为「基督徒」，是在________。',
        acceptAnswers: ['安提阿', '安提阿城'],
      },
      th: {
        text: 'สาวกถูกเรียกว่า "คริสเตียน" เป็นครั้งแรกที่ ________',
        acceptAnswers: ['อันทิโอก', 'แอนทิออก'],
      },
      id: {
        text: 'Murid-murid pertama kali disebut "Kristen" di ________.',
        acceptAnswers: ['Antiokhia', 'Antioch', 'Antiokia'],
      },
    },
  },
  // 9 fill
  {
    id: 'ap_q9',
    type: 'fill',
    timeLimit: 30,
    locales: {
      zh: {
        text: '保罗第二次旅行中，夜间看见________异象，福音因此首次进入欧洲，先后到腓立比、帖撒罗尼迦、雅典、哥林多等地。',
        acceptAnswers: ['马其顿', '马其顿人', '馬其頓'],
      },
      th: {
        text: 'ในการเดินทางครั้งที่สองของเปาโล ท่านเห็นนิมิตชาว ________ ในกลางคืน ข่าวประเสริฐจึงเข้ายุโรปเป็นครั้งแรก ไปยังฟีลิปปี เธสะโลนิกา เอเธนส์ และโครินธ์',
        acceptAnswers: ['มาซิโดเนีย', 'ชาวมาซิโดเนีย'],
      },
      id: {
        text: 'Pada perjalanan kedua, Paulus melihat penglihatan seorang ________ pada malam hari. Injil pun pertama kali masuk ke Eropa: Filipi, Tesalonika, Atena, dan Korintus.',
        acceptAnswers: ['Makedonia', 'Macedonia', 'orang Makedonia'],
      },
    },
  },
  // 10 fill
  {
    id: 'ap_q10',
    type: 'fill',
    timeLimit: 25,
    locales: {
      zh: {
        text: '约主后 100 年，使徒________在以弗所一带离世，使徒时代结束。',
        acceptAnswers: ['约翰', '約翰'],
      },
      th: {
        text: 'ราว ค.ศ. 100 อัครทูต ________ สิ้นชีวิตแถบเอเฟซัส และยุคอัครทูตสิ้นสุดลง',
        acceptAnswers: ['ยอห์น', 'จอห์น'],
      },
      id: {
        text: 'Sekitar tahun 100 M, Rasul ________ meninggal di sekitar Efesus, dan Zaman Kerasulan berakhir.',
        acceptAnswers: ['Yohanes', 'John'],
      },
    },
  },
  // 11 order
  {
    id: 'ap_q11',
    type: 'order',
    timeLimit: 45,
    locales: {
      zh: {
        text: '按项目中的大致年份，从早到晚排列下列事件：',
        items: [
          '五旬节，教会在耶路撒冷诞生（约 34）',
          '司提反殉道（约 35）',
          '保罗在大马士革路上悔改（约 36）',
          '耶路撒冷会议（约 49）',
          '尼禄逼迫，彼得、保罗先后殉道（约 64）',
        ],
      },
      th: {
        text: 'เรียงเหตุการณ์ต่อไปนี้จากก่อนไปหลัง ตามปีโดยประมาณในโครงการ',
        items: [
          'วันเพ็นเทคอสต์ คริสตจักรเกิดที่เยรูซาเล็ม (ราว 34)',
          'สเทเฟนเป็นมรณสักขี (ราว 35)',
          'เปาโลกลับใจบนทางไปดามัสกัส (ราว 36)',
          'สภาเยรูซาเล็ม (ราว 49)',
          'การข่มเหงของเนโร เปโตรและเปาโลเป็นมรณสักขี (ราว 64)',
        ],
      },
      id: {
        text: 'Urutkan peristiwa berikut dari yang paling awal hingga yang paling akhir, menurut tahun perkiraan dalam proyek.',
        items: [
          'Pentakosta, gereja lahir di Yerusalem (sekitar 34)',
          'Kemartiran Stefanus (sekitar 35)',
          'Paulus bertobat di jalan Damsyik (sekitar 36)',
          'Konsili Yerusalem (sekitar 49)',
          'Penganiayaan Nero; Petrus dan Paulus mati syahid (sekitar 64)',
        ],
      },
    },
  },
  // 12 choice pairing — B
  {
    id: 'ap_q12',
    type: 'choice',
    timeLimit: 35,
    correctIndex: 1,
    locales: {
      zh: {
        text: '按优西比乌所引传统，下列使徒与工场配对正确的是：',
        options: [
          '多马—亚西亚；安得烈—帕提亚；约翰—斯基提亚；彼得—罗马',
          '多马—帕提亚；安得烈—斯基提亚；约翰—亚西亚；彼得—罗马',
          '多马—罗马；安得烈—亚西亚；约翰—帕提亚；彼得—斯基提亚',
          '多马—斯基提亚；安得烈—罗马；约翰—帕提亚；彼得—亚西亚',
        ],
      },
      th: {
        text: 'ตามประเพณีที่ยูซีเบียสอ้าง ข้อใดจับคู่อัครทูตกับทุ่งงานถูกต้อง',
        options: [
          'โธมัส—เอเชีย；อันดรูว์—พาร์เธีย；ยอห์น—ไซเธีย；เปโตร—โรม',
          'โธมัส—พาร์เธีย；อันดรูว์—ไซเธีย；ยอห์น—เอเชีย；เปโตร—โรม',
          'โธมัส—โรม；อันดรูว์—เอเชีย；ยอห์น—พาร์เธีย；เปโตร—ไซเธีย',
          'โธมัส—ไซเธีย；อันดรูว์—โรม；ยอห์น—พาร์เธีย；เปโตร—เอเชีย',
        ],
      },
      id: {
        text: 'Menurut tradisi yang dikutip Eusebius, pasangan rasul dan ladang yang tepat adalah:',
        options: [
          'Tomas—Asia; Andreas—Parthia; Yohanes—Skithia; Petrus—Roma',
          'Tomas—Parthia; Andreas—Skithia; Yohanes—Asia; Petrus—Roma',
          'Tomas—Roma; Andreas—Asia; Yohanes—Parthia; Petrus—Skithia',
          'Tomas—Skithia; Andreas—Roma; Yohanes—Parthia; Petrus—Asia',
        ],
      },
    },
  },
  // 13 TF true
  {
    id: 'ap_q13',
    type: 'truefalse',
    timeLimit: 20,
    correctIndex: 0,
    locales: {
      zh: {
        text: '司提反被石头打死时，扫罗也喜悦他被害。',
        options: ['正确', '错误'],
      },
      th: {
        text: 'ขณะสเทเฟนถูกหินขว้างตาย เซาโลก็เห็นชอบด้วยที่ท่านถูกฆ่า',
        options: ['ถูก', 'ผิด'],
      },
      id: {
        text: 'Ketika Stefanus dilempari batu sampai mati, Saulus juga menyetujui pembunuhan itu.',
        options: ['Benar', 'Salah'],
      },
    },
  },
  // 14 TF false
  {
    id: 'ap_q14',
    type: 'truefalse',
    timeLimit: 20,
    correctIndex: 1,
    locales: {
      zh: {
        text: '保罗第一次旅行布道的同伴是西拉，路线主要是进入欧洲。',
        options: ['正确', '错误'],
      },
      th: {
        text: 'เพื่อนร่วมเดินทางในการเดินทางประกาศครั้งแรกของเปาโลคือสิลาส และเส้นทางหลักคือการเข้าสู่ยุโรป',
        options: ['ถูก', 'ผิด'],
      },
      id: {
        text: 'Rekan Paulus pada perjalanan misi pertama adalah Silas, dan rutenya terutama masuk ke Eropa.',
        options: ['Benar', 'Salah'],
      },
    },
  },
  // 15 TF true
  {
    id: 'ap_q15',
    type: 'truefalse',
    timeLimit: 20,
    correctIndex: 0,
    locales: {
      zh: {
        text: '耶路撒冷教会起初仍到会堂崇拜、遵守犹太律法，尚未与犹太信仰生活完全分离。',
        options: ['正确', '错误'],
      },
      th: {
        text: 'คริสตจักรที่เยรูซาเล็มในตอนแรกยังนมัสการในธรรมศาลาและรักษากฎหมายยิว ยังไม่แยกจากชีวิตความเชื่อของชาวยิวอย่างสมบูรณ์',
        options: ['ถูก', 'ผิด'],
      },
      id: {
        text: 'Pada mulanya jemaat Yerusalem masih beribadah di sinagoge dan menaati hukum Yahudi, serta belum sepenuhnya terpisah dari kehidupan iman Yahudi.',
        options: ['Benar', 'Salah'],
      },
    },
  },
  // 16 TF true
  {
    id: 'ap_q16',
    type: 'truefalse',
    timeLimit: 20,
    correctIndex: 0,
    locales: {
      zh: {
        text: '尼禄逼迫的直接借口是公元 64 年罗马城大火，基督徒被诬为纵火者。',
        options: ['正确', '错误'],
      },
      th: {
        text: 'ข้ออ้างโดยตรงของการข่มเหงในสมัยเนโรคือไฟไหม้กรุงโรมปี ค.ศ. 64 โดยคริสตชนถูกใส่ร้ายว่าเป็นผู้วางเพลิง',
        options: ['ถูก', 'ผิด'],
      },
      id: {
        text: 'Dalih langsung penganiayaan Nero adalah kebakaran kota Roma pada tahun 64 M, dan orang Kristen dituduh sebagai pembakar.',
        options: ['Benar', 'Salah'],
      },
    },
  },
  // 17 TF false
  {
    id: 'ap_q17',
    type: 'truefalse',
    timeLimit: 20,
    correctIndex: 1,
    locales: {
      zh: {
        text: '多马传统只记他在耶路撒冷牧养，没有指向帕提亚或印度。',
        options: ['正确', '错误'],
      },
      th: {
        text: 'ประเพณีเรื่องโธมัสบันทึกเพียงว่าท่านรับใช้ในเยรูซาเล็ม ไม่ได้ชี้ไปยังพาร์เธียหรืออินเดีย',
        options: ['ถูก', 'ผิด'],
      },
      id: {
        text: 'Tradisi tentang Tomas hanya mencatat bahwa ia melayani di Yerusalem, tanpa menunjuk ke Parthia atau India.',
        options: ['Benar', 'Salah'],
      },
    },
  },
  // 18 TF true
  {
    id: 'ap_q18',
    type: 'truefalse',
    timeLimit: 25,
    correctIndex: 0,
    locales: {
      zh: {
        text: '本地信徒与讲希腊文的犹太信徒因供应问题发生矛盾后，教会指定七人委员会处理，被视为执事团的起源。',
        options: ['正确', '错误'],
      },
      th: {
        text: 'เมื่อผู้เชื่อท้องถิ่นกับผู้เชื่อชาวยิวที่พูดภาษากรีกขัดแย้งเรื่องการจัดหาสิ่งจำเป็น คริสตจักรจึงแต่งตั้งคณะกรรมการเจ็ดคน ซึ่งถือเป็นต้นกำเนิดของตำแหน่งมหาสนุเทศ',
        options: ['ถูก', 'ผิด'],
      },
      id: {
        text: 'Setelah umat setempat dan umat Yahudi berbahasa Yunani berselisih soal pembagian bantuan, gereja menunjuk panitia tujuh orang, yang dipandang sebagai asal-usul diakonat.',
        options: ['Benar', 'Salah'],
      },
    },
  },
]

const db = JSON.parse(readFileSync(DB, 'utf8'))
const idx = db.quizzes.findIndex((q) => q.id === QUIZ_ID)
if (idx < 0) {
  console.error('找不到使徒时代题库，id=', QUIZ_ID)
  process.exit(1)
}

db.quizzes[idx] = {
  ...db.quizzes[idx],
  title: '使徒时代 · Zaman Kerasulan · ยุคอัครทูต',
  languages,
  defaultLanguage: 'zh',
  questions,
  updatedAt: Date.now(),
  // 清理旧顶层字段
}

// 去掉可能残留的旧字段
delete db.quizzes[idx].text

writeFileSync(DB, JSON.stringify(db, null, 2), 'utf8')
console.log('已更新：', db.quizzes[idx].title)
console.log('语言：', languages.map((l) => l.label).join(' / '))
console.log('题数：', questions.length)
console.log('账号 ownerId：', db.quizzes[idx].ownerId)

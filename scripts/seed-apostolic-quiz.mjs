import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB = join(__dirname, '..', 'server', 'data', 'db.json')

const db = JSON.parse(readFileSync(DB, 'utf8'))
const owner = db.users.find((u) => u.username === '于昊恩')
if (!owner) throw new Error('找不到账号：于昊恩')

const id = () => randomUUID()
const now = Date.now()

const questions = [
  {
    id: id(),
    type: 'choice',
    text: '项目把使徒时代的起止定为：\nไทย โครงการกำหนดช่วงเวลาของยุคอัครทูตไว้ว่า\nIndonesia Proyek ini menetapkan Zaman Kerasulan berlangsung pada:',
    timeLimit: 25,
    options: [
      '主后 1–70 年 / ค.ศ. 1–70 / 1–70 M',
      '主后 34–100 年 / ค.ศ. 34–100 / 34–100 M',
      '主后 100–313 年 / ค.ศ. 100–313 / 100–313 M',
      '主后 64–95 年 / ค.ศ. 64–95 / 64–95 M',
    ],
    correctIndex: 1,
  },
  {
    id: id(),
    type: 'choice',
    text: '五旬节当天，彼得讲道之后约有多少人受洗归主？\nไทย ในวันเพ็นเทคอสต์ หลังเปโตรเทศนา มีผู้รับบัพติศมาประมาณกี่คน\nIndonesia Pada hari Pentakosta, setelah khotbah Petrus, kira-kira berapa orang yang dibaptis?',
    timeLimit: 25,
    options: [
      '一百二十人 / หนึ่งร้อยยี่สิบคน / seratus dua puluh orang',
      '五百人 / ห้าร้อยคน / lima ratus orang',
      '三千人 / สามพันคน / tiga ribu orang',
      '五千人 / ห้าพันคน / lima ribu orang',
    ],
    correctIndex: 2,
  },
  {
    id: id(),
    type: 'choice',
    text: '耶路撒冷会议（约主后 49 年）的主要结论是：\nไทย ข้อสรุปหลักของสภาเยรูซาเล็ม (ราว ค.ศ. 49) คือ\nIndonesia Kesimpulan utama Konsili Yerusalem (sekitar tahun 49 M) adalah:',
    timeLimit: 30,
    options: [
      '外邦人必须先受割礼，才能得救',
      '外邦人因信得救，不必先成为犹太人',
      '福音只向犹太人传',
      '教会总部迁到罗马',
    ],
    correctIndex: 1,
  },
  {
    id: id(),
    type: 'choice',
    text: '教会传统把使徒约翰被放逐拔摩岛，主要和哪一次逼迫连在一起？\nไทย ประเพณีคริสตจักรเชื่อมการที่อัครทูตยอห์นถูกเนรเทศไปเกาะปัทมอส กับการข่มเหงครั้งใดเป็นหลัก\nIndonesia Tradisi gereja terutama menghubungkan pembuangan Rasul Yohanes ke pulau Patmos dengan penganiayaan yang mana?',
    timeLimit: 25,
    options: [
      '尼禄（第一次） / เนโร (ครั้งที่หนึ่ง) / Nero (yang pertama)',
      '多米提安（第二次） / โดมิเทียน (ครั้งที่สอง) / Domitianus (yang kedua)',
      '图拉真（第三次） / ไตรอัน (ครั้งที่สาม) / Trajanus (yang ketiga)',
      '戴克里先大逼迫 / การข่มเหงครั้งใหญ่ของไดโอคลีเทียน / Penganiayaan Besar Diocletianus',
    ],
    correctIndex: 1,
  },
  {
    id: id(),
    type: 'choice',
    text: '初期三大宣教中心及其主要面向，哪一项对应正确？\nไทย ศูนย์พันธกิจสามแห่งยุคแรกกับกลุ่มคนที่แต่ละแห่งมุ่งไป ข้อใดถูกต้อง\nIndonesia Manakah pasangan yang tepat untuk tiga pusat misi awal dan sasaran utamanya?',
    timeLimit: 30,
    options: [
      '耶路撒冷向外邦人，安提阿向犹太人，以弗所向罗马',
      '耶路撒冷向犹太人，安提阿向外邦人，以弗所为宣教与教导中心',
      '三处都只向犹太人传福音',
      '以弗所是教会诞生之地',
    ],
    correctIndex: 1,
  },
  {
    id: id(),
    type: 'fill',
    text: '教会首位殉道者是七执事之一的________；他被害后，门徒分散到犹太和撒玛利亚各处传道。\nไทย มรณสักขีคนแรกของคริสตจักรคือ ________\nIndonesia Martir pertama gereja adalah ________',
    timeLimit: 30,
    acceptAnswers: ['司提反', 'สเทเฟน', 'Stefanus', 'Stephen', '斯提反', '司提芬'],
  },
  {
    id: id(),
    type: 'fill',
    text: '扫罗在往________的路上遇见主，眼睛暂时失明，后由亚拿尼亚按手，受洗归主。\nไทย เซาโลได้พบองค์พระผู้เป็นเจ้าบนทางไป ________\nIndonesia Saulus bertemu Tuhan di jalan menuju ________',
    timeLimit: 25,
    acceptAnswers: ['大马士革', 'ดามัสกัส', 'Damsyik', 'Damascus', '大馬士革'],
  },
  {
    id: id(),
    type: 'fill',
    text: '信徒第一次被称为「基督徒」，是在________。\nไทย สาวกถูกเรียกว่า "คริสเตียน" เป็นครั้งแรกที่ ________\nIndonesia Murid-murid pertama kali disebut "Kristen" di ________',
    timeLimit: 25,
    acceptAnswers: ['安提阿', 'อันทิโอก', 'Antiokhia', 'Antioch', '安提約', '安提阿城'],
  },
  {
    id: id(),
    type: 'fill',
    text: '保罗第二次旅行中，夜间看见________异象，福音因此首次进入欧洲，先后到腓立比、帖撒罗尼迦、雅典、哥林多等地。\nไทย ในการเดินทางครั้งที่สองของเปาโล ท่านเห็นนิมิตชาว ________ ในกลางคืน\nIndonesia Pada perjalanan kedua, Paulus melihat penglihatan seorang ________ pada malam hari',
    timeLimit: 30,
    acceptAnswers: ['马其顿', 'มาซิโดเนีย', 'Makedonia', 'Macedonia', '馬其頓', '马其顿人'],
  },
  {
    id: id(),
    type: 'fill',
    text: '约主后 100 年，使徒________在以弗所一带离世，使徒时代结束。\nไทย ราว ค.ศ. 100 อัครทูต ________ สิ้นชีวิตแถบเอเฟซัส\nIndonesia Sekitar tahun 100 M, Rasul ________ meninggal di sekitar Efesus',
    timeLimit: 25,
    acceptAnswers: ['约翰', 'ยอห์น', 'Yohanes', 'John', '約翰'],
  },
  {
    id: id(),
    type: 'order',
    text: '按项目中的大致年份，从早到晚排列。\nไทย เรียงเหตุการณ์ต่อไปนี้จากก่อนไปหลัง\nIndonesia Urutkan peristiwa berikut dari yang paling awal hingga yang paling akhir',
    timeLimit: 45,
    items: [
      'B. 五旬节，教会在耶路撒冷诞生（约 34）',
      'D. 司提反殉道（约 35）',
      'E. 保罗在大马士革路上悔改（约 36）',
      'A. 耶路撒冷会议（约 49）',
      'C. 尼禄逼迫，彼得、保罗先后殉道（约 64）',
    ],
  },
  {
    id: id(),
    type: 'choice',
    text: '按优西比乌所引传统，下列使徒与工场配对正确的是：\nไทย ตามประเพณีที่ยูซีเบียสอ้าง ข้อใดจับคู่อัครทูตกับทุ่งงานถูกต้อง\nIndonesia Menurut tradisi Eusebius, pasangan rasul dan ladang yang tepat adalah:',
    timeLimit: 35,
    options: [
      '多马—亚西亚；安得烈—帕提亚；约翰—斯基提亚；彼得—罗马',
      '多马—帕提亚；安得烈—斯基提亚；约翰—亚西亚；彼得—罗马',
      '多马—罗马；安得烈—亚西亚；约翰—帕提亚；彼得—斯基提亚',
      '多马—斯基提亚；安得烈—罗马；约翰—帕提亚；彼得—亚西亚',
    ],
    correctIndex: 1,
  },
  {
    id: id(),
    type: 'truefalse',
    text: '司提反被石头打死时，扫罗也喜悦他被害。\nไทย ขณะสเทเฟนถูกหินขว้างตาย เซาโลก็เห็นชอบด้วยที่ท่านถูกฆ่า\nIndonesia Ketika Stefanus dilempari batu sampai mati, Saulus juga menyetujui pembunuhan itu.',
    timeLimit: 20,
    options: ['正确', '错误'],
    correctIndex: 0,
  },
  {
    id: id(),
    type: 'truefalse',
    text: '保罗第一次旅行布道的同伴是西拉，路线主要是进入欧洲。\nไทย เพื่อนร่วมเดินทางในการเดินทางประกาศครั้งแรกของเปาโลคือสิลาส และเส้นทางหลักคือการเข้าสู่ยุโรป\nIndonesia Rekan Paulus pada perjalanan misi pertama adalah Silas, dan rutenya terutama masuk ke Eropa.',
    timeLimit: 20,
    options: ['正确', '错误'],
    correctIndex: 1,
  },
  {
    id: id(),
    type: 'truefalse',
    text: '耶路撒冷教会起初仍到会堂崇拜、遵守犹太律法，尚未与犹太信仰生活完全分离。\nไทย คริสตจักรที่เยรูซาเล็มในตอนแรกยังนมัสการในธรรมศาลาและรักษากฎหมายยิว\nIndonesia Pada mulanya jemaat Yerusalem masih beribadah di sinagoge dan menaati hukum Yahudi.',
    timeLimit: 20,
    options: ['正确', '错误'],
    correctIndex: 0,
  },
  {
    id: id(),
    type: 'truefalse',
    text: '尼禄逼迫的直接借口是公元 64 年罗马城大火，基督徒被诬为纵火者。\nไทย ข้ออ้างโดยตรงของการข่มเหงในสมัยเนโรคือไฟไหม้กรุงโรมปี ค.ศ. 64\nIndonesia Dalih langsung penganiayaan Nero adalah kebakaran kota Roma pada tahun 64 M.',
    timeLimit: 20,
    options: ['正确', '错误'],
    correctIndex: 0,
  },
  {
    id: id(),
    type: 'truefalse',
    text: '多马传统只记他在耶路撒冷牧养，没有指向帕提亚或印度。\nไทย ประเพณีเรื่องโธมัสบันทึกเพียงว่าท่านรับใช้ในเยรูซาเล็ม ไม่ได้ชี้ไปยังพาร์เธียหรืออินเดีย\nIndonesia Tradisi tentang Tomas hanya mencatat bahwa ia melayani di Yerusalem, tanpa menunjuk ke Parthia atau India.',
    timeLimit: 20,
    options: ['正确', '错误'],
    correctIndex: 1,
  },
  {
    id: id(),
    type: 'truefalse',
    text: '本地信徒与讲希腊文的犹太信徒因供应问题发生矛盾后，教会指定七人委员会处理，被视为执事团的起源。\nไทย เมื่อผู้เชื่อท้องถิ่นกับผู้เชื่อชาวยิวที่พูดภาษากรีกขัดแย้งเรื่องการจัดหาสิ่งจำเป็น คริสตจักรจึงแต่งตั้งคณะกรรมการเจ็ดคน\nIndonesia Setelah umat setempat dan umat Yahudi berbahasa Yunani berselisih soal pembagian bantuan, gereja menunjuk panitia tujuh orang.',
    timeLimit: 25,
    options: ['正确', '错误'],
    correctIndex: 0,
  },
]

const quiz = {
  id: randomUUID(),
  title: '使徒时代 · Zaman Kerasulan · ยุคอัครทูต',
  questions,
  ownerId: owner.id,
  createdAt: now,
  updatedAt: now,
}

db.quizzes.push(quiz)
writeFileSync(DB, JSON.stringify(db, null, 2), 'utf8')

console.log(`已写入账号：${owner.username}`)
console.log(`测验标题：${quiz.title}`)
console.log(`题目数量：${questions.length}`)
console.log(`quizId：${quiz.id}`)

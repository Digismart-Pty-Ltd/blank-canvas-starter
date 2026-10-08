import trail from "@/assets/event-trail.jpg";
import night from "@/assets/event-night.jpg";
import park from "@/assets/event-park.jpg";
import long from "@/assets/event-long.jpg";

export type Tier = "Pink" | "Silver" | "Gold" | "Platinum";

export type Event = {
  id: string;
  title: string;
  date: string; // ISO
  time: string;
  meetingPlace: string;
  afterRunPlace: string;
  description: string;
  image: string;
  membersOnly: boolean;
  distanceKm: number | string;
  attendees: { name: string; tier?: Tier; openRunner?: boolean }[];
};

export const events: Event[] = [
  {
    id: "evt-1",
    title: "Sunrise Trail 8K",
    date: "2026-05-24",
    time: "05:30",
    meetingPlace: "Little Falls Park, North Gate",
    afterRunPlace: "Roast & Co. Coffee, Falls Centre",
    description:
      "Roll out of bed and into the trails. Rolling singletrack, a few cheeky climbs, big payoff at the top.",
    image: trail,
    membersOnly: false,
    distanceKm: 8,
    attendees: [
      { name: "Thandi M.", tier: "Gold" },
      { name: "Sipho K.", tier: "Silver" },
      { name: "Ruan vd Berg", openRunner: true },
      { name: "Lerato N.", tier: "Pink" },
    ],
  },
  {
    id: "evt-2",
    title: "Neon Night 5K",
    date: "2026-05-28",
    time: "19:00",
    meetingPlace: "Clubhouse, Wilgerood Rd",
    afterRunPlace: "The Tap Room, Cnr 4th & Main",
    description:
      "Glow sticks, headlamps and a stupidly fast loop through the suburbs. No one is chasing us — but try keep up.",
    image: night,
    membersOnly: true,
    distanceKm: 5,
    attendees: [
      { name: "Thandi M.", tier: "Gold" },
      { name: "Kabelo R.", tier: "Platinum" },
      { name: "Anika P.", tier: "Silver" },
    ],
  },
  {
    id: "evt-3",
    title: "Saturday Parkrun Crew",
    date: "2026-05-31",
    time: "07:00",
    meetingPlace: "Little Falls Parkrun Start",
    afterRunPlace: "Picnic Lawn (BYO chair)",
    description:
      "Bring the family. Bring the dog. Bring the slow ones. We meet 15min early for warm up and crew photo.",
    image: park,
    membersOnly: false,
    distanceKm: 5,
    attendees: [
      { name: "Marco S.", openRunner: true },
      { name: "Lerato N.", tier: "Pink" },
      { name: "Phumzile D.", tier: "Silver" },
      { name: "Anika P.", tier: "Silver" },
      { name: "Sipho K.", tier: "Silver" },
    ],
  },
  {
    id: "evt-4",
    title: "Long Sunday 21K",
    date: "2026-06-08",
    time: "06:00",
    meetingPlace: "Clubhouse, Wilgerood Rd",
    afterRunPlace: "Breakfast at Olive & Oak",
    description:
      "Half marathon pace as you choose. Two water tables on the route. Pacers for 5:30, 6:00 and 6:30.",
    image: long,
    membersOnly: false,
    distanceKm: 21,
    attendees: [
      { name: "Kabelo R.", tier: "Platinum" },
      { name: "Thandi M.", tier: "Gold" },
      { name: "Marco S.", openRunner: true },
    ],
  },
];

export type Member = {
  id: string;
  name: string;
  email: string;
  joined: string;
  races: number;
  tier: Tier;
  rewardsPending: number;
};

export const members: Member[] = [
  {
    id: "m1",
    name: "Kabelo Radebe",
    email: "kabelo@lfr.run",
    joined: "2024-02-12",
    races: 41,
    tier: "Platinum",
    rewardsPending: 1,
  },
  {
    id: "m2",
    name: "Thandi Mokoena",
    email: "thandi@lfr.run",
    joined: "2024-06-01",
    races: 27,
    tier: "Gold",
    rewardsPending: 0,
  },
  {
    id: "m3",
    name: "Sipho Khumalo",
    email: "sipho@lfr.run",
    joined: "2025-01-10",
    races: 14,
    tier: "Silver",
    rewardsPending: 1,
  },
  {
    id: "m4",
    name: "Anika Pretorius",
    email: "anika@lfr.run",
    joined: "2025-03-04",
    races: 12,
    tier: "Silver",
    rewardsPending: 0,
  },
  {
    id: "m5",
    name: "Lerato Ndlovu",
    email: "lerato@lfr.run",
    joined: "2025-09-22",
    races: 6,
    tier: "Pink",
    rewardsPending: 0,
  },
  {
    id: "m6",
    name: "Phumzile Dube",
    email: "phumzile@lfr.run",
    joined: "2024-11-15",
    races: 19,
    tier: "Silver",
    rewardsPending: 1,
  },
];

export const openRunners = [
  { id: "o1", name: "Marco Silva", email: "marco@gmail.com", lastRun: "2026-05-10" },
  { id: "o2", name: "Ruan van den Berg", email: "ruan@gmail.com", lastRun: "2026-05-14" },
];

export type Reward = {
  id: string;
  tier: Tier | "Special";
  title: string;
  description: string;
  expiresInDays: number;
};

export const rewards: Reward[] = [
  {
    id: "r1",
    tier: "Pink",
    title: "Branded buff",
    description: "LFR pink buff. Collect at clubhouse.",
    expiresInDays: 30,
  },
  {
    id: "r2",
    tier: "Silver",
    title: "Tech tee voucher",
    description: "R250 off any club tee.",
    expiresInDays: 30,
  },
  {
    id: "r3",
    tier: "Gold",
    title: "Free race entry",
    description: "Any sponsored road race up to R350.",
    expiresInDays: 30,
  },
  {
    id: "r4",
    tier: "Platinum",
    title: "Coaching session",
    description: "1-on-1 hour with Waven.",
    expiresInDays: 30,
  },
  {
    id: "r5",
    tier: "Special",
    title: "May Mileage Mania",
    description: "Log 100km in May — branded cap.",
    expiresInDays: 14,
  },
];

export const pricing = [
  {
    name: "Starter",
    price: 650,
    period: "/month",
    features: ["1x session / week", "Programme via WhatsApp", "Monthly check-in"],
    highlight: false,
  },
  {
    name: "Performance",
    price: 1450,
    period: "/month",
    features: [
      "3x sessions / week",
      "Custom programming",
      "Nutrition guidance",
      "Weekly check-ins",
    ],
    highlight: true,
  },
  {
    name: "Elite",
    price: 2400,
    period: "/month",
    features: [
      "5x sessions / week",
      "Race-day prep",
      "Recovery & mobility plan",
      "24/7 WhatsApp access",
    ],
    highlight: false,
  },
];

export const WHATSAPP_NUMBER = "27715643417";

export const BANK_DETAILS = {
  accountName: "WAQS Trading (Pty) Ltd",
  bank: "FNB",
  accountNumber: "62841523914",
  accountType: "Gold Business Account",
  branchCode: "210636",
};

export const ADMIN_EMAIL = "wavenharper@gmail.com";

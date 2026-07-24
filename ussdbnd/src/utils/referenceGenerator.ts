
import Member from '../models/Member';
import Contribution from '../models/Contribution';


export async function generateMemberId(): Promise<string> {
  const count = await Member.countDocuments();
  const next = count + 1;
  const padded = String(next).padStart(3, '0');
  const candidate = `MEM${padded}`;

  const exists = await Member.findOne({ memberId: candidate });
  if (exists) {
    return generateFallbackMemberId();
  }

  return candidate;
}

async function generateFallbackMemberId(): Promise<string> {
  let candidate: string;
  let exists;
  do {
    const rand = Math.floor(Math.random() * 9000 + 1000);
    candidate = `MEM${rand}`;
    exists = await Member.findOne({ memberId: candidate });
  } while (exists);
  return candidate;
}


export async function generateReference(): Promise<string> {
  let candidate: string;
  let exists;
  do {
    const rand = Math.floor(Math.random() * 9000 + 1000);
    candidate = `RCC-${rand}`;
    exists = await Contribution.findOne({ reference: candidate });
  } while (exists);
  return candidate;
}
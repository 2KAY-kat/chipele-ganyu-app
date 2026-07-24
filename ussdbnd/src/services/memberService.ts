
import Member, { IMember } from '../models/Member';
import bcrypt from 'bcrypt';

export async function findMemberById(memberId: string): Promise<IMember | null> {
  return Member.findOne({ memberId });
}

export async function verifyMemberPin(member: IMember, pin: string): Promise<boolean> {
  return bcrypt.compare(pin, member.pinHash);
}

export async function createMember(data: {
  memberId: string;
  fullName: string;
  nationalId: string;
  mobileMoneyNumber: string;
  pin: string;
}): Promise<IMember> {
  const pinHash = await bcrypt.hash(data.pin, 10);
  return Member.create({
    memberId: data.memberId,
    fullName: data.fullName,
    nationalId: data.nationalId,
    mobileMoneyNumber: data.mobileMoneyNumber,
    pinHash,
  });
}

export async function getMemberWithCircles(memberId: string): Promise<IMember | null> {
  return Member.findOne({ memberId }).populate('circles');
}
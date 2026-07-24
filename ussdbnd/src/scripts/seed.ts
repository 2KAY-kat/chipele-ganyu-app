
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Member from '../models/Member';
import Circle from '../models/Circle';

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected for seeding...');

  const member = await Member.findOne({ memberId: 'MEM001' });
  if (!member) {
    console.error('MEM001 not found — run registration first.');
    process.exit(1);
  }

  let circle = await Circle.findOne({ name: 'Circle A' });
  if (!circle) {
    circle = await Circle.create({
      name: 'Circle A',
      cycleNumber: 3,
      contributionAmount: 500,
      members: [member._id],
      payoutOrder: [member._id],
      currentPayoutIndex: 0,
      status: 'active',
    });
    console.log('Circle A created:', circle._id);
  } else {
    if (!circle.members.includes(member._id)) {
      circle.members.push(member._id);
      circle.payoutOrder.push(member._id);
      await circle.save();
    }
    console.log('Circle A already existed, member attached.');
  }

  member.circles.push(circle._id as any);
  await member.save();

  console.log('Seed complete. Member', member.memberId, 'is now in', circle.name);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
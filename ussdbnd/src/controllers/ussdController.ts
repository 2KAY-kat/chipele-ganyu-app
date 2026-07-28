import { Request, Response } from 'express';
import { db } from '../config/db';
import { contributions, walletTransactions } from '../db/schema';
import { getSession, updateSession, endSession, USSDSession } from '../services/sessionService';
import { generateMemberId, generateReference } from '../utils/referenceGenerator';
import {
  findMemberById,
  verifyMemberPin,
  createMember,
  getMemberWithCircles,
} from '../services/memberService';
import {
  findCircleById,
  getCircleWithPayoutOrder,
  countCompletedContributions,
  getAllCircles,
  joinCircle,
  isMemberInCircle,
  checkAndProcessPayout,
  createNewCycle,
} from '../services/circleService';
import { getWalletBalance } from '../services/walletService';

interface USSDRequestBody {
  sessionId: string;
  phoneNumber: string;
  text: string;
}

export async function handleUSSD(req: Request, res: Response): Promise<void> {
  const { sessionId, phoneNumber, text } = req.body as USSDRequestBody;

  const session = getSession(sessionId, phoneNumber);
  const inputs = text.split('*').filter(Boolean);
  const latestInput = inputs[inputs.length - 1] ?? '';

  let response = '';

  try {
    response = await routeStep(session, latestInput);
  } catch (err) {
    console.error('USSD error:', err);
    response = 'END Something went wrong. Please try again later.';
    endSession(sessionId);
    res.set('Content-Type', 'text/plain');
    res.send(response);
    return;
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
}

async function routeStep(session: USSDSession, input: string): Promise<string> {
  switch (session.step) {
    case 'WELCOME':
      return handleWelcome(session, input);
    case 'REGISTER_NAME':
      return handleRegisterName(session, input);
    case 'REGISTER_NATIONAL_ID':
      return handleRegisterNationalId(session, input);
    case 'REGISTER_MOBILE_MONEY':
      return handleRegisterMobileMoney(session, input);
    case 'REGISTER_PIN':
      return handleRegisterPin(session, input);
    case 'LOGIN_MEMBER_ID':
      return handleLoginMemberId(session, input);
    case 'LOGIN_PIN':
      return handleLoginPin(session, input);
    case 'MAIN_MENU':
      return handleMainMenu(session, input);
    case 'SELECT_CIRCLE':
      return handleSelectCircle(session, input);
    case 'CONFIRM_PAYMENT':
      return handleConfirmPayment(session, input);
    case 'JOIN_CIRCLE_SELECT':
      return handleJoinCircleSelect(session, input);
    case 'STATUS_SELECT_CIRCLE':
      return handleStatusSelectCircle(session, input);
    case 'CREATE_CYCLE_SELECT':
      return handleCreateCycleSelect(session, input);
    case 'HELP':
      return handleHelp(session, input);
    default:
      endSession(session.sessionId);
      return 'END Session expired. Please dial *123# again.';
  }
}

const MAIN_MENU_TEXT =
  '1. Make Contribution\n2. Check Balance\n3. Check Cycle Status\n4. Join a Circle\n5. Help\n6. Create a Cycle\n0. Logout';

function handleWelcome(session: USSDSession, input: string): string {
  if (input === '') {
    return 'CON Welcome to RCC Cooperative!\n1. Register\n2. Login\n0. Exit';
  }
  if (input === '1') {
    updateSession(session.sessionId, { step: 'REGISTER_NAME' });
    return 'CON Enter your Full Name:';
  }
  if (input === '2') {
    updateSession(session.sessionId, { step: 'LOGIN_MEMBER_ID' });
    return 'CON Enter Member ID:';
  }
  if (input === '0') {
    endSession(session.sessionId);
    return 'END Thank you for using Chipeleganyu Online Cooperative!';
  }
  return 'CON Invalid option.\n1. Register\n2. Login\n0. Exit';
}

function handleRegisterName(session: USSDSession, input: string): string {
  updateSession(session.sessionId, {
    step: 'REGISTER_NATIONAL_ID',
    data: { ...session.data, fullName: input },
  });
  return 'CON Enter National ID:';
}

function handleRegisterNationalId(session: USSDSession, input: string): string {
  updateSession(session.sessionId, {
    step: 'REGISTER_MOBILE_MONEY',
    data: { ...session.data, nationalId: input },
  });
  return 'CON Enter Mobile Money Number:';
}

function handleRegisterMobileMoney(session: USSDSession, input: string): string {
  updateSession(session.sessionId, {
    step: 'REGISTER_PIN',
    data: { ...session.data, mobileMoneyNumber: input },
  });
  return 'CON Set a 4-digit PIN:';
}

async function handleRegisterPin(session: USSDSession, input: string): Promise<string> {
  if (!/^\d{4}$/.test(input)) {
    return 'CON PIN must be exactly 4 digits. Set a 4-digit PIN:';
  }

  const { fullName, nationalId, mobileMoneyNumber } = session.data;
  const memberId = await generateMemberId();

  await createMember({
    memberId,
    fullName,
    nationalId,
    mobileMoneyNumber,
    pin: input,
  });

  endSession(session.sessionId);
  return `END Registration successful!\nYour Member ID: ${memberId}\nDial in again to login and join a circle.`;
}

function handleLoginMemberId(session: USSDSession, input: string): string {
  updateSession(session.sessionId, {
    step: 'LOGIN_PIN',
    data: { ...session.data, memberIdInput: input },
  });
  return 'CON Enter PIN:';
}

async function handleLoginPin(session: USSDSession, input: string): Promise<string> {
  const member = await findMemberById(session.data.memberIdInput);

  if (!member) {
    endSession(session.sessionId);
    return 'END Member ID not found. Please dial *123# again.';
  }

  const validPin = await verifyMemberPin(member, input);
  if (!validPin) {
    endSession(session.sessionId);
    return 'END Incorrect PIN. Please dial *123# again.';
  }

  updateSession(session.sessionId, {
    step: 'MAIN_MENU',
    memberId: member.memberId,
  });

  return `CON Welcome, ${member.fullName}!\n${MAIN_MENU_TEXT}`;
}

async function handleMainMenu(session: USSDSession, input: string): Promise<string> {
  if (input === '1') {
    const member = await getMemberWithCircles(session.memberId!);
    if (!member || member.circles.length === 0) {
      endSession(session.sessionId);
      return 'END You are not part of any savings circle yet.\nSelect option 4 next time to join one.';
    }

    const circleOptions = member.circles
      .map((c, i) => `${i + 1}. ${c.name} (MK${c.contributionAmount})`)
      .join('\n');

    updateSession(session.sessionId, {
      step: 'SELECT_CIRCLE',
      data: { ...session.data, circleIds: member.circles.map((c) => c.id) },
    });

    return `CON Select Circle:\n${circleOptions}\n0. Back`;
  }

  if (input === '2') {
    const balance = await getBalanceSummary(session.memberId!);
    endSession(session.sessionId);
    return `END Wallet Balances:\n1. Contribution Wallet: ${balance.contribution}\n2. Disbursement Wallet: ${balance.disbursement}\n3. Fee Wallet: ${balance.fee}`;
  }

  if (input === '3') {
    const member = await getMemberWithCircles(session.memberId!);
    if (!member || member.circles.length === 0) {
      endSession(session.sessionId);
      return 'END You are not part of any savings circle.';
    }

    const circles = member.circles;

    if (circles.length === 1) {
      const status = await getCycleStatusText(circles[0].id);
      endSession(session.sessionId);
      return status;
    }

    const options = circles.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
    updateSession(session.sessionId, {
      step: 'STATUS_SELECT_CIRCLE',
      data: { ...session.data, statusCircleIds: circles.map((c) => c.id) },
    });
    return `CON Select Circle:\n${options}\n0. Back`;
  }

  if (input === '4') {
    const allCircles = await getAllCircles();
    const options = allCircles
      .map((c, i) => `${i + 1}. ${c.name} (MK${c.contributionAmount})`)
      .join('\n');

    updateSession(session.sessionId, {
      step: 'JOIN_CIRCLE_SELECT',
      data: { ...session.data, allCircleIds: allCircles.map((c) => c.id) },
    });

    return `CON Select a Circle to Join:\n${options}\n0. Back`;
  }

  if (input === '5') {
    updateSession(session.sessionId, { step: 'HELP' });
    return 'CON Help / Support\n1. How to Contribute\n2. How Payouts Work\n3. Contact Admin\n0. Back';
  }

  if (input === '6') {
    const member = await getMemberWithCircles(session.memberId!);
    if (!member || member.circles.length === 0) {
      endSession(session.sessionId);
      return 'END You are not part of any savings circle yet.\nSelect option 4 next time to join one.';
    }

    const circleOptions = member.circles
      .map((c, i) => `${i + 1}. ${c.name} (MK${c.contributionAmount})`)
      .join('\n');

    updateSession(session.sessionId, {
      step: 'CREATE_CYCLE_SELECT',
      data: { ...session.data, createCycleCircleIds: member.circles.map((c) => c.id) },
    });

    return `CON Select Circle to create a new cycle:\n${circleOptions}\n0. Back`;
  }

  if (input === '0') {
    endSession(session.sessionId);
    return 'END Logged out. Thank you!';
  }

  return `CON Invalid option.\n${MAIN_MENU_TEXT}`;
}

function handleHelp(session: USSDSession, input: string): string {
  if (input === '0') {
    updateSession(session.sessionId, { step: 'MAIN_MENU' });
    return `CON Welcome back!\n${MAIN_MENU_TEXT}`;
  }

  if (input === '1') {
    endSession(session.sessionId);
    return 'END How to Contribute:\nLogin, choose "Make Contribution", pick your circle, confirm payment. Each circle has a fixed amount per cycle.';
  }

  if (input === '2') {
    endSession(session.sessionId);
    return 'END How Payouts Work:\nEach cycle, all members contribute a fixed amount. Once everyone has paid, the full pool is paid out to one member on rotation. Every member gets a turn.';
  }

  if (input === '3') {
    endSession(session.sessionId);
    return 'END Contact Admin:\nCall 0991 234 567 or visit your nearest RCC Cooperative office for help.';
  }

  return 'CON Invalid option.\n1. How to Contribute\n2. How Payouts Work\n3. Contact Admin\n0. Back';
}

async function handleStatusSelectCircle(session: USSDSession, input: string): Promise<string> {
  if (input === '0') {
    updateSession(session.sessionId, { step: 'MAIN_MENU' });
    return `CON Welcome back!\n${MAIN_MENU_TEXT}`;
  }

  const circleIds: number[] = session.data.statusCircleIds || [];
  const index = parseInt(input, 10) - 1;
  const circleId = circleIds[index];

  if (!circleId) {
    return 'CON Invalid selection. Please try again.\n0. Back';
  }

  const status = await getCycleStatusText(circleId);
  endSession(session.sessionId);
  return status;
}

async function handleJoinCircleSelect(session: USSDSession, input: string): Promise<string> {
  if (input === '0') {
    updateSession(session.sessionId, { step: 'MAIN_MENU' });
    return `CON Welcome back!\n${MAIN_MENU_TEXT}`;
  }

  const circleIds: number[] = session.data.allCircleIds || [];
  const index = parseInt(input, 10) - 1;
  const circleId = circleIds[index];

  if (!circleId) {
    return 'CON Invalid selection. Please try again.\n0. Back';
  }

  const circle = await findCircleById(circleId);
  const member = await findMemberById(session.memberId!);

  if (!circle || !member) {
    endSession(session.sessionId);
    return 'END Something went wrong. Please try again.';
  }

  const alreadyIn = await isMemberInCircle(circle.id, member.id);
  if (alreadyIn) {
    endSession(session.sessionId);
    return `END You are already a member of ${circle.name}.`;
  }

  await joinCircle(circle.id, member.id);

  endSession(session.sessionId);
  return `END You have joined ${circle.name}!\nContribution amount: MK${circle.contributionAmount} per cycle.`;
}

async function handleSelectCircle(session: USSDSession, input: string): Promise<string> {
  if (input === '0') {
    updateSession(session.sessionId, { step: 'MAIN_MENU' });
    return `CON Welcome back!\n${MAIN_MENU_TEXT}`;
  }

  const circleIds: number[] = session.data.circleIds || [];
  const index = parseInt(input, 10) - 1;
  const circleId = circleIds[index];

  if (!circleId) {
    return 'CON Invalid selection. Select Circle:\n0. Back';
  }

  const circle = await findCircleById(circleId);
  if (!circle) {
    endSession(session.sessionId);
    return 'END Circle not found.';
  }

  updateSession(session.sessionId, {
    step: 'CONFIRM_PAYMENT',
    data: {
      ...session.data,
      selectedCircleId: circleId,
      selectedCircleName: circle.name,
      amount: circle.contributionAmount,
    },
  });

  return `CON You are about to pay MK${circle.contributionAmount} to ${circle.name}\n1. Confirm\n2. Cancel`;
}

async function handleConfirmPayment(session: USSDSession, input: string): Promise<string> {
  if (input === '2') {
    endSession(session.sessionId);
    return 'END Payment cancelled.';
  }

  if (input !== '1') {
    return 'CON Invalid option.\n1. Confirm\n2. Cancel';
  }

  const { selectedCircleId, amount } = session.data;
  const circle = await findCircleById(selectedCircleId);
  const member = await findMemberById(session.memberId!);

  if (!circle || !member) {
    endSession(session.sessionId);
    return 'END Something went wrong. Please try again.';
  }

  const reference = await generateReference();

  db.insert(contributions).values({
    memberId: member.id,
    circleId: circle.id,
    cycleNumber: circle.cycleNumber,
    amount,
    reference,
    status: 'completed',
  }).run();

  db.insert(walletTransactions).values({
    memberId: member.id,
    walletType: 'contribution',
    direction: 'credit',
    amount,
    reference,
  }).run();

  const payout = await checkAndProcessPayout(circle.id);

  endSession(session.sessionId);

  if (payout) {
    return `END Payment Successful!\nReference: ${reference}\n\nCycle complete! MK${payout.amount} paid out to Member ${payout.recipientMemberId} (Ref: ${payout.reference}).`;
  }

  return `END Payment Successful!\nReference: ${reference}`;
}

async function handleCreateCycleSelect(session: USSDSession, input: string): Promise<string> {
  if (input === '0') {
    updateSession(session.sessionId, { step: 'MAIN_MENU' });
    return `CON Welcome back!\n${MAIN_MENU_TEXT}`;
  }

  const circleIds: number[] = session.data.createCycleCircleIds || [];
  const index = parseInt(input, 10) - 1;
  const circleId = circleIds[index];

  if (!circleId) {
    return 'CON Invalid selection. Please try again.\n0. Back';
  }

  const circle = await findCircleById(circleId);
  if (!circle) {
    endSession(session.sessionId);
    return 'END Circle not found.';
  }

  const result = await createNewCycle(circleId);
  if (!result) {
    endSession(session.sessionId);
    return 'END Could not create cycle. Please try again.';
  }

  endSession(session.sessionId);
  return `END New cycle created for ${circle.name}!\nCycle Number: C${result.cycleNumber}`;
}

async function getBalanceSummary(memberId: string) {
  const member = await findMemberById(memberId);
  if (!member) return { contribution: 0, disbursement: 0, fee: 0 };

  const [contribution, disbursement, fee] = await Promise.all([
    getWalletBalance(member.id, 'contribution'),
    getWalletBalance(member.id, 'disbursement'),
    getWalletBalance(member.id, 'fee'),
  ]);

  return { contribution, disbursement, fee };
}

async function getCycleStatusText(circleId: number): Promise<string> {
  const circle = await findCircleById(circleId);
  if (!circle) return 'END Circle not found.';

  const populated = await getCircleWithPayoutOrder(circleId);
  if (!populated) return 'END Circle not found.';

  const contributionsCount = await countCompletedContributions(circleId, circle.cycleNumber);

  const nextPayoutMember = (populated as any).payoutOrder?.[circle.currentPayoutIndex];
  const nextPayoutLabel = nextPayoutMember?.memberId ?? 'N/A';

  const mCount = (populated as any).payoutOrder?.length ?? 0;

  return `END ${circle.name} Status:\nCycle Number: C${circle.cycleNumber}\nTotal Members: ${mCount}\nContributions Paid: ${contributionsCount}\nNext Payout: Member ${nextPayoutLabel}`;
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const date = searchParams.get('date');
  const id = searchParams.get('id');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const days = searchParams.get('days');

  try {
    switch (type) {
      case 'settings': {
        const settings = await db.settings.findUnique({
          where: { id: 'app_settings' },
        });
        return NextResponse.json(settings || null);
      }

      case 'diary_entries': {
        if (date) {
          const entry = await db.diaryEntry.findUnique({
            where: { date },
          });
          if (entry) {
            return NextResponse.json({
              ...entry,
              classification: entry.classification ? JSON.parse(entry.classification) : null,
              conversation: entry.conversation ? JSON.parse(entry.conversation) : [],
            });
          }
          return NextResponse.json(null);
        }

        if (id) {
          const entry = await db.diaryEntry.findUnique({
            where: { id },
          });
          if (entry) {
            return NextResponse.json({
              ...entry,
              classification: entry.classification ? JSON.parse(entry.classification) : null,
              conversation: entry.conversation ? JSON.parse(entry.conversation) : [],
            });
          }
          return NextResponse.json(null);
        }

        const entries = await db.diaryEntry.findMany({
          orderBy: { date: 'desc' },
        });

        return NextResponse.json(
          entries.map((entry) => ({
            ...entry,
            classification: entry.classification ? JSON.parse(entry.classification) : null,
            conversation: entry.conversation ? JSON.parse(entry.conversation) : [],
          }))
        );
      }

      case 'chat_messages': {
        if (!date) {
          return NextResponse.json({ error: 'date is required' }, { status: 400 });
        }
        const chat = await db.chatMessages.findUnique({
          where: { date },
        });
        return NextResponse.json(chat ? JSON.parse(chat.messages) : null);
      }

      case 'emotion_stats': {
        const daysNum = days ? parseInt(days) : 7;
        const now = new Date();
        const startDateObj = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);
        const startDateStr = startDateObj.toISOString().split('T')[0];

        const entries = await db.diaryEntry.findMany({
          where: {
            date: {
              gte: startDateStr,
            },
          },
          orderBy: { date: 'asc' },
        });

        const stats = entries
          .filter((entry) => entry.classification && entry.classification !== '{}')
          .map((entry) => {
            const classification = JSON.parse(entry.classification || '{}');
            return {
              date: entry.date,
              score: classification.emotionScore || 0,
            };
          });

        return NextResponse.json(stats);
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Storage GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');

  try {
    const body = await request.json();

    switch (type) {
      case 'settings': {
        const { password, biometricEnabled } = body;
        const settings = await db.settings.upsert({
          where: { id: 'app_settings' },
          update: {
            password,
            biometricEnabled: biometricEnabled ?? false,
          },
          create: {
            id: 'app_settings',
            password,
            biometricEnabled: biometricEnabled ?? false,
          },
        });
        return NextResponse.json(settings);
      }

      case 'diary_entries': {
        const { id, date, content, summary, classification, conversation } = body;

        const entry = await db.diaryEntry.upsert({
          where: { id },
          update: {
            date,
            content,
            summary,
            classification: classification ? JSON.stringify(classification) : null,
            conversation: conversation ? JSON.stringify(conversation) : '[]',
          },
          create: {
            id,
            date,
            content,
            summary,
            classification: classification ? JSON.stringify(classification) : null,
            conversation: conversation ? JSON.stringify(conversation) : '[]',
          },
        });

        return NextResponse.json({
          ...entry,
          classification: entry.classification ? JSON.parse(entry.classification) : null,
          conversation: entry.conversation ? JSON.parse(entry.conversation) : [],
        });
      }

      case 'chat_messages': {
        const { date, messages } = body;

        const chat = await db.chatMessages.upsert({
          where: { date },
          update: {
            messages: JSON.stringify(messages),
          },
          create: {
            id: `chat_${date}`,
            date,
            messages: JSON.stringify(messages),
          },
        });

        return NextResponse.json(JSON.parse(chat.messages));
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Storage POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const date = searchParams.get('date');

  try {
    switch (type) {
      case 'diary_entries': {
        if (!id) {
          return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }
        await db.diaryEntry.delete({
          where: { id },
        });
        return NextResponse.json({ success: true });
      }

      case 'chat_messages': {
        if (!date) {
          return NextResponse.json({ error: 'date is required' }, { status: 400 });
        }
        await db.chatMessages.delete({
          where: { date },
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Storage DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

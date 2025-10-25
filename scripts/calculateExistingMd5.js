import crypto from 'crypto';
import { PrismaClient } from '@/generated/prisma/index.js';

const prisma = new PrismaClient();

async function calculateMd5ForExistingDocuments() {
  console.log('🔄 Starting MD5 calculation for existing documents...');
  
  try {
    // Find all documents that don't have MD5 or have placeholder MD5
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { md5sum: null },
          { md5sum: 'migration_placeholder' }
        ]
      },
      select: {
        id: true,
        originalName: true,
        content: true
      }
    });

    console.log(`📄 Found ${documents.length} documents to process`);

    let processed = 0;
    let errors = 0;

    for (const doc of documents) {
      try {
        // Calculate MD5 hash from content
        const md5sum = crypto.createHash('md5').update(doc.content, 'utf8').digest('hex');
        
        // Update document with calculated MD5
        await prisma.document.update({
          where: { id: doc.id },
          data: { md5sum }
        });

        processed++;
        console.log(`✅ Processed: ${doc.originalName} (${processed}/${documents.length})`);
      } catch (error) {
        errors++;
        console.error(`❌ Error processing ${doc.originalName}:`, error.message);
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully processed: ${processed} documents`);
    console.log(`❌ Errors: ${errors} documents`);

    // Check for potential duplicates
    console.log('\n🔍 Checking for potential duplicate documents...');
    const duplicates = await prisma.document.groupBy({
      by: ['md5sum', 'knowledgeBaseId'],
      having: {
        md5sum: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        md5sum: true
      }
    });

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} groups of duplicate documents:`);
      for (const dup of duplicates) {
        const docs = await prisma.document.findMany({
          where: {
            md5sum: dup.md5sum,
            knowledgeBaseId: dup.knowledgeBaseId
          },
          select: {
            id: true,
            originalName: true,
            createdAt: true,
            knowledgeBase: {
              select: {
                name: true
              }
            }
          }
        });
        
        console.log(`\n📋 Knowledge Base: ${docs[0].knowledgeBase.name}`);
        console.log(`🔗 MD5: ${dup.md5sum}`);
        docs.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc.originalName} (${doc.createdAt.toISOString()})`);
        });
      }
      console.log('\n💡 Consider removing duplicate documents manually if needed.');
    } else {
      console.log('✅ No duplicate documents found.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
calculateMd5ForExistingDocuments();

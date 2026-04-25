/**
 * API Usage Examples
 * 
 * This file demonstrates how to use the AI services directly in your code.
 * All examples work with both mock data and real APIs.
 */

import { openaiService } from '../services/ai/openai';
import { elevenlabsService } from '../services/ai/elevenlabs';
import { videoGenerationService } from '../services/ai/video';
import { projectsService } from '../services/api/projects';
import { creditsService } from '../services/api/credits';
import { videoWorkflowService } from '../services/videoWorkflow';

// ============================================
// Example 1: Generate a Script
// ============================================

export async function example1_generateScript() {
  console.log('--- Example 1: Generate Script ---');
  
  const response = await openaiService.generateScript({
    prompt: 'Create a promotional video for a new fitness app',
    mood: 'energetic',
    duration: 15,
    template: 'Product Showcase',
  });

  console.log('Generated Script:');
  console.log(response.script);
  console.log(`Word Count: ${response.wordCount}`);
  console.log(`Estimated Duration: ${response.estimatedDuration}s`);
  
  return response.script;
}

// ============================================
// Example 2: Improve an Existing Script
// ============================================

export async function example2_improveScript() {
  console.log('--- Example 2: Improve Script ---');
  
  const originalScript = 'Check out our new app. It helps you track fitness.';
  
  const response = await openaiService.improveScript(
    originalScript,
    'Make it more energetic and include a call-to-action'
  );

  console.log('Original:', originalScript);
  console.log('Improved:', response.script);
  
  return response.script;
}

// ============================================
// Example 3: Get Available Voices
// ============================================

export async function example3_getVoices() {
  console.log('--- Example 3: Get Voices ---');
  
  const voices = await elevenlabsService.getVoices();
  
  console.log(`Found ${voices.length} voices:`);
  voices.forEach(voice => {
    console.log(`- ${voice.name} (${voice.gender}, ${voice.accent}): ${voice.description}`);
  });
  
  return voices;
}

// ============================================
// Example 4: Generate Voice Audio
// ============================================

export async function example4_generateVoice() {
  console.log('--- Example 4: Generate Voice ---');
  
  const script = 'Welcome to our amazing fitness app! Get fit, stay healthy, and reach your goals!';
  
  const response = await elevenlabsService.generateSpeech({
    text: script,
    voiceId: 'sarah',
    stability: 0.5,
    similarityBoost: 0.75,
  });

  console.log('Voice generated successfully!');
  console.log(`Audio URL: ${response.audioUrl}`);
  console.log(`Duration: ${response.duration}s`);
  console.log(`Format: ${response.format}`);
  
  return response;
}

// ============================================
// Example 5: Create a Project
// ============================================

export async function example5_createProject() {
  console.log('--- Example 5: Create Project ---');
  
  const project = await projectsService.createProject('user-123', {
    title: 'My First Video',
    script: 'This is my first AI-generated video script!',
    voiceId: 'sarah',
    voiceName: 'Sarah',
    template: 'Product Showcase',
    mood: 'energetic',
    format: '9:16',
    duration: 15,
  });

  console.log('Project created:');
  console.log(`ID: ${project.id}`);
  console.log(`Title: ${project.title}`);
  console.log(`Status: ${project.status}`);
  console.log(`Credits required: ${project.metadata?.credits}`);
  
  return project;
}

// ============================================
// Example 6: Check User Credits
// ============================================

export async function example6_checkCredits() {
  console.log('--- Example 6: Check Credits ---');
  
  const credits = await creditsService.getUserCredits('user-123');
  
  console.log('User Credits:');
  console.log(`Available: ${credits.credits}`);
  console.log(`Subscription: ${credits.subscriptionTier}`);
  console.log(`Total Used: ${credits.totalCreditsUsed}`);
  console.log(`Videos Generated: ${credits.totalVideosGenerated}`);
  
  return credits;
}

// ============================================
// Example 7: Get Subscription Plans
// ============================================

export async function example7_getPlans() {
  console.log('--- Example 7: Get Subscription Plans ---');
  
  const plans = creditsService.getSubscriptionPlans();
  
  console.log(`Available plans: ${plans.length}`);
  plans.forEach(plan => {
    console.log(`\n${plan.name} - $${plan.price}/${plan.interval}`);
    console.log(`  Credits: ${plan.credits}`);
    console.log(`  Features: ${plan.features.length}`);
    if (plan.popular) console.log('  ⭐ POPULAR');
  });
  
  return plans;
}

// ============================================
// Example 8: Generate Video (Complete Workflow)
// ============================================

export async function example8_generateVideo() {
  console.log('--- Example 8: Complete Video Generation ---');
  
  const projectId = await videoWorkflowService.generateVideo(
    {
      userId: 'user-123',
      title: 'Product Launch Video',
      scriptPrompt: 'Promote a new mobile fitness app',
      voiceId: 'sarah',
      template: 'Product Showcase',
      mood: 'energetic',
      format: '9:16',
      duration: 15,
    },
    (progress) => {
      console.log(`[${progress.step}] ${progress.progress}% - ${progress.message}`);
      
      if (progress.error) {
        console.error(`Error: ${progress.error}`);
      }
    }
  );

  console.log(`\nVideo generated! Project ID: ${projectId}`);
  
  const project = await projectsService.getProject(projectId);
  if (project) {
    console.log(`Status: ${project.status}`);
    console.log(`Video URL: ${project.videoUrl || 'Processing...'}`);
  }
  
  return projectId;
}

// ============================================
// Example 9: Generate Video with Custom Script
// ============================================

export async function example9_generateWithCustomScript() {
  console.log('--- Example 9: Generate with Custom Script ---');
  
  const customScript = `
    Hey there! Ready to transform your life?
    Our new app makes fitness fun and easy.
    Join thousands who've already started their journey.
    Download now and get 30 days free!
  `.trim();
  
  const projectId = await videoWorkflowService.generateVideo(
    {
      userId: 'user-123',
      title: 'Custom Script Video',
      script: customScript, // Using custom script instead of AI generation
      voiceId: 'emma',
      template: 'Advertisement',
      mood: 'energetic',
      format: '9:16',
      duration: 20,
    },
    (progress) => {
      console.log(`Progress: ${progress.progress}% - ${progress.message}`);
    }
  );

  console.log(`Video with custom script generated! Project ID: ${projectId}`);
  
  return projectId;
}

// ============================================
// Example 10: Get Project Stats
// ============================================

export async function example10_getStats() {
  console.log('--- Example 10: Get Project Statistics ---');
  
  const stats = await projectsService.getProjectStats('user-123');
  
  console.log('Project Statistics:');
  console.log(`Total Projects: ${stats.total}`);
  console.log(`Completed: ${stats.completed}`);
  console.log(`Processing: ${stats.processing}`);
  console.log(`Total Views: ${stats.totalViews}`);
  console.log(`Total Downloads: ${stats.totalDownloads}`);
  
  return stats;
}

// ============================================
// Example 11: List User Projects
// ============================================

export async function example11_listProjects() {
  console.log('--- Example 11: List User Projects ---');
  
  const projects = await projectsService.getUserProjects('user-123');
  
  console.log(`Found ${projects.length} projects:`);
  projects.forEach(project => {
    console.log(`\n${project.title}`);
    console.log(`  Status: ${project.status}`);
    console.log(`  Template: ${project.template}`);
    console.log(`  Created: ${new Date(project.createdAt).toLocaleDateString()}`);
    console.log(`  Views: ${project.metadata?.views || 0}`);
  });
  
  return projects;
}

// ============================================
// Example 12: Credit Transaction History
// ============================================

export async function example12_transactionHistory() {
  console.log('--- Example 12: Transaction History ---');
  
  const transactions = await creditsService.getTransactionHistory('user-123', 10);
  
  console.log(`Recent transactions: ${transactions.length}`);
  transactions.forEach(txn => {
    const sign = txn.amount > 0 ? '+' : '';
    console.log(`${sign}${txn.amount} credits - ${txn.description} (${txn.type})`);
  });
  
  return transactions;
}

// ============================================
// Run All Examples
// ============================================

export async function runAllExamples() {
  console.log('\n========================================');
  console.log('Running All API Examples');
  console.log('========================================\n');
  
  try {
    await example1_generateScript();
    console.log('\n');
    
    await example2_improveScript();
    console.log('\n');
    
    await example3_getVoices();
    console.log('\n');
    
    await example4_generateVoice();
    console.log('\n');
    
    await example5_createProject();
    console.log('\n');
    
    await example6_checkCredits();
    console.log('\n');
    
    await example7_getPlans();
    console.log('\n');
    
    await example10_getStats();
    console.log('\n');
    
    await example11_listProjects();
    console.log('\n');
    
    await example12_transactionHistory();
    console.log('\n');
    
    console.log('========================================');
    console.log('All Examples Completed Successfully!');
    console.log('========================================');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run all examples:
// runAllExamples();

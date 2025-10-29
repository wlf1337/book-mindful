import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookId, promptType, customInstruction } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch book info
    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .select('title, author, description')
      .eq('id', bookId)
      .single();

    if (bookError) throw new Error('Book not found');

    // Fetch user's notes for this book
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('content, note_type, page_number, created_at')
      .eq('book_id', bookId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (notesError) throw new Error('Failed to fetch notes');

    // Fetch the AI prompt
    const { data: promptData, error: promptError } = await supabase
      .from('ai_prompts')
      .select('system_prompt')
      .eq('prompt_type', promptType)
      .single();

    if (promptError) throw new Error('Prompt type not found');

    // Prepare the context for AI
    const bookInfo = `Book: "${bookData.title}" by ${bookData.author || 'Unknown'}
${bookData.description ? `Description: ${bookData.description}` : ''}`;

    const notesContext = notes && notes.length > 0
      ? `\n\nUser's Notes:\n${notes.map((note, idx) => 
          `${idx + 1}. [${note.note_type}${note.page_number ? `, page ${note.page_number}` : ''}]: ${note.content}`
        ).join('\n')}`
      : '\n\nNo notes available for this book.';

    const userMessage = customInstruction 
      ? `${bookInfo}${notesContext}\n\nUser's Request: ${customInstruction}`
      : `${bookInfo}${notesContext}`;

    console.log('Calling OpenAI with prompt type:', promptType);

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: promptData.system_prompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI error:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Successfully generated content');

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in process-notes-ai:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
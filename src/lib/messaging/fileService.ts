import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const uploadFile = async (file: File, conversationId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
  const filePath = `chat-files/${fileName}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-files')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const uploadImage = async (file: File, conversationId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
  const filePath = `chat-images/${fileName}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-files')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const uploadDocument = async (file: File, conversationId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
  const filePath = `chat-documents/${fileName}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-files')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const uploadVideo = async (file: File, conversationId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
  const filePath = `chat-videos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-files')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const deleteFile = async (filePath: string): Promise<void> => {
  const { error } = await supabase.storage
    .from('chat-files')
    .remove([filePath]);

  if (error) throw error;
};

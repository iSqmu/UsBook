import { supabase } from '@/libs/supabase';

export async function getInvites(userId: string) {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('to', userId);
  return { data, error };
}

export async function sendInvite(toUserCode: string, fromUserId: string) {
  try {
    const toUserId = await getUserIdByCode(toUserCode);

    const { data, error } = await supabase.from('invites').insert({
      to: toUserId,
      from: fromUserId,
    });

    
    return { data, error };
  } catch (e) {
    console.log('sendInvite catch:', JSON.stringify(e));
    throw e;
  }
}

export async function acceptInvite(inviteId: string) {
  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select('*')
    .eq('id', inviteId)
    .single();
  if (inviteError) {
    console.error('Error fetching invite:', inviteError);
    return { error: inviteError };
  }
  //! get the codes of the users involved in the invite
  const codeTo = await getCodeByUserId(invite.to);
  const codeFrom = await getCodeByUserId(invite.from);

  if (!codeTo || !codeFrom) {
    const errorMessage = 'Error fetching user codes.';
    console.error(errorMessage);
    return { error: new Error(errorMessage) };
  }

  // Update the partner_code of the user who received the invite

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ partner_code: codeFrom })
    .eq('id', invite.to);

  if (updateError) {
    console.error('Error updating partner_code:', updateError);
    return { error: updateError };
  }

  //update the partner_code of the user who sent the invite
  const { error: updateErrorFrom } = await supabase
    .from('profiles')
    .update({ partner_code: codeTo })
    .eq('id', invite.from);

  if (updateErrorFrom) {
    console.error('Error updating partner_code for sender:', updateErrorFrom);
    return { error: updateErrorFrom };
  }

  // Delete the invite after accepting
  const { error: deleteError } = await supabase
    .from('invites')
    .delete()
    .eq('id', inviteId);
  if (deleteError) {
    console.error('Error deleting invite:', deleteError);
    return { error: deleteError };
  }
}

export async function declineInvite(inviteId: string) {
  const { error } = await supabase.from('invites').delete().eq('id', inviteId);
  return { error };
}

async function getUserIdByCode(code: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('code', code)
    .single();
  if (error) {
    console.error('Error fetching user ID:', error);
    throw new Error('Error fetching user ID');
  }
  return data?.id || null;
}

async function getCodeByUserId(UserId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('code')
    .eq('id', UserId)
    .single();

  if (error) {
    console.error('Error fetching code:', error);
  }

  return data?.code || null;
}

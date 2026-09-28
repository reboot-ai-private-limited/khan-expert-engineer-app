import { useCallback, useEffect, useState } from 'react';
import { engineerAuthApi } from '@/api/endpoints/engineerAuth';
import { AuthError, type OtpPurpose } from '@/types/auth';

/** Mirrors the server's own resend cooldown (otpService.OTP_RESEND_AFTER_SECONDS). */
const DEFAULT_RESEND_SECONDS = 60;

/**
 * Sending (and re-sending) a WhatsApp code, shared by login, registration
 * and account deletion. The server enforces the cooldown too — the countdown
 * here only keeps the engineer from tapping into a refusal.
 */
export function useOtpSender(purpose: OtpPurpose) {
  const [sending, setSending] = useState(false);
  /** The number the current code went to — null until a code is sent. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  /** Resolves true when a code went out; throws an AuthError otherwise. */
  const send = useCallback(
    async (phone: string): Promise<boolean> => {
      if (sending) return false;
      setSending(true);
      try {
        const result = await engineerAuthApi.sendOtp(phone, purpose);
        setSentTo(phone.trim());
        setMessage(result.message);
        setSecondsLeft(result.resendAfterSeconds || DEFAULT_RESEND_SECONDS);
        return true;
      } catch (error) {
        throw error instanceof AuthError ? error : new AuthError('unknown', 'Could not send the code. Try again.');
      } finally {
        setSending(false);
      }
    },
    [purpose, sending]
  );

  /** Back to "enter your number" — e.g. the engineer typed the wrong one. */
  const reset = useCallback(() => {
    setSentTo(null);
    setMessage(null);
  }, []);

  return { send, reset, sending, sentTo, message, secondsLeft, canResend: secondsLeft <= 0 && !sending };
}

import { useState, type FormEvent } from 'react';
import {
  validateDisplayName, writeLocalProfile, type LocalProfile,
} from './localProfile';

const AVATARS: LocalProfile['avatar'][] = ['🐱', '🌷', '⭐', '🎀'];

export function ProfilePanel({
  profile,
  onSaved,
  onClose,
}: {
  profile: LocalProfile | null;
  onSaved: (next: LocalProfile) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile?.displayName ?? '');
  const [avatar, setAvatar] = useState<LocalProfile['avatar']>(profile?.avatar ?? '🐱');
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateDisplayName(name);
    if (issue) {
      setError(issue);
      return;
    }
    const next = {
      displayName: name.trim(),
      avatar,
      createdAt: profile?.createdAt ?? Date.now(),
    };
    try {
      writeLocalProfile(next);
      onSaved(next);
      onClose();
    } catch {
      setError('Your browser could not save the profile. Check site storage permissions and try again.');
    }
  }

  return (
    <section className="pixel-window profile-editor mt-5" aria-label="My local profile">
      <div className="pixel-window-title"><span>♡ MY_PROFILE.DAT</span><span aria-hidden="true">★</span></div>
      <form onSubmit={submit} className="profile-editor-body">
        <div>
          <p className="pixel-kicker">a scrapbook with your name on it</p>
          <h2 className="pixel-heading mt-2 text-2xl sm:text-3xl">
            {profile ? 'make it yours, again ♡' : 'create your local profile ♡'}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#6d3454]">
            Choose a name and a little icon. This personalizes this browser only.
            No password, email, sign-in or cloud account is created, and your cats stay private.
          </p>
        </div>
        <div className="profile-editor-fields">
          <label className="grid gap-2 text-sm font-bold text-[#6a1e49]" htmlFor="profile-name">
            Your display name
            <input
              id="profile-name" className="pixel-input min-h-12 px-3" value={name}
              onChange={(event) => { setName(event.target.value); setError(null); }}
              autoComplete="nickname" maxLength={64} placeholder="e.g. a cat's favorite human"
              required
            />
          </label>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold text-[#6a1e49]">Choose your sticker</legend>
            <div className="profile-avatar-options">
              {AVATARS.map((symbol) => (
                <label key={symbol} className={'profile-avatar-choice' + (avatar === symbol ? ' is-selected' : '')}>
                  <input
                    type="radio" name="profile-avatar" value={symbol}
                    checked={avatar === symbol}
                    onChange={() => setAvatar(symbol)}
                  />
                  <span aria-label={'Avatar ' + symbol}>{symbol}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {error && <p role="alert" className="text-sm font-bold text-[#9e1b55]">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="pixel-primary">♡ Save my profile</button>
          <button type="button" className="pixel-secondary" onClick={onClose}>Not now</button>
        </div>
        <p className="text-xs leading-5 text-[#7a4965]">
          Important: this is a device-only profile, not an account. Clearing site data
          or using another browser will not restore your profile or cat collection.
        </p>
      </form>
    </section>
  );
}

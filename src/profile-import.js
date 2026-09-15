const sameProfile = (a, b) => a?.steam_id === b.steam_id && a?.profile_id === b.profile_id;

// Approval is temporary; linking a different import source never replaces the original.
async function approveProfileImport(profile, request, confirm) {
    let original = (await request('get')).profile;
    if (!original) {
        if (!await confirm(null, profile)) return false;
        original = (await request('link', profile)).profile;
        if (!original) throw new Error('Rocksmith profile could not be linked. Please try again.');
    }
    if (sameProfile(original, profile)) return true;
    // Another PC may have established the original link while the dialog was open.
    return confirm(original, profile);
}

module.exports = { approveProfileImport };

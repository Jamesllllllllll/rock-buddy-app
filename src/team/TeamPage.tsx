import { Link } from 'react-router-dom';

const members = [
    ['TNTMusicStudios', 'Founder / Lead Developer', 'TNT.png'],
    ['MrsTNT33', 'Admin / Developer', 'MrsTNT.png'],
    ['Recontastic', 'UI Designer / Rubber Ducky', 'recon.png'],
    ['StajiW', 'Special FX / Guru', 'staji.png'],
    ['connor_harkness', 'Natural Product Enhancement', 'connor.png'],
    ['Jimmy_Pants_', 'Cloud Wrangler', 'jimmy-pants.png'],
];

export function TeamPage() {
    return <main className="center-page"><div className="card"><h1>Team Members</h1>
        <ul className="list-team-members">{members.map(([name, role, image]) => <li key={name}>
            <a href={`https://www.twitch.tv/${name.toLowerCase()}`} onClick={event => { event.preventDefault(); window.api.openExternalLink(event.currentTarget.href); }}>
                <img src={`../images/${image}`} alt={name} /><span className="member-title">{name}</span><span className="member-title-hover">{role}</span>
            </a>
        </li>)}</ul>
        <section className="team-support" aria-labelledby="team-support-heading">
            <h2 id="team-support-heading">Support Rock Buddy</h2>
            <p>Community support makes Rock Buddy possible. Thank you for being part of it!</p>
            <p>You can support Rock Buddy with a one-time or monthly donation.</p>
            <Link to="/support" replace>Make a donation</Link>
        </section>
    </div></main>;
}

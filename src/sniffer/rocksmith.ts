export class Rocksmith {
    private readonly _profilePath: string;
    private _profileData: any;
    private _profileTimestamp: number = 0;

    public static async create() {
        const config = await window.api.resolveRocksmithConfig();
        if (!config) throw new Error('Choose your Steam folder and Rocksmith profile in Config. No single saved profile could be selected automatically.');
        return new Rocksmith(config.profilePath);
    }

    private constructor(profilePath: string) {
        this._profilePath = profilePath;
    }

    public async newProfileDataAvailable(): Promise<boolean> {
        const profileTimestamp = await window.api.getFileTimestamp(this._profilePath);
        return this._profileTimestamp !== profileTimestamp;
    }

    public async getProfileData(): Promise<any> {
        if (await this.newProfileDataAvailable()) {
            this._profileTimestamp = await window.api.getFileTimestamp(this._profilePath);
            this._profileData = await window.api.readRocksmithData(this._profilePath);
        }

        return this._profileData;
    }
};

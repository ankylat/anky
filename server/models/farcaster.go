package models

type Cast struct {
	Object               string         `json:"object"`
	Hash                 string         `json:"hash"`
	ThreadHash           string         `json:"thread_hash"`
	ParentHash           *string        `json:"parent_hash"`
	ParentURL            string         `json:"parent_url"`
	RootParentURL        string         `json:"root_parent_url"`
	ParentAuthor         Author         `json:"parent_author"`
	Author               Author         `json:"author"`
	Text                 string         `json:"text"`
	Timestamp            string         `json:"timestamp"`
	Embeds               []Embed        `json:"embeds"`
	Frames               []Frame        `json:"frames"`
	Reactions            Reactions      `json:"reactions"`
	Replies              Replies        `json:"replies"`
	Channel              Channel        `json:"channel"`
	MentionedProfiles    []Author       `json:"mentioned_profiles"`
	AuthorChannelContext ChannelContext `json:"author_channel_context"`
}

type Author struct {
	Object            string            `json:"object"`
	FID               int               `json:"fid"`
	Username          string            `json:"username"`
	DisplayName       string            `json:"display_name"`
	PfpURL            string            `json:"pfp_url"`
	CustodyAddress    string            `json:"custody_address"`
	Profile           Profile           `json:"profile"`
	FollowerCount     int               `json:"follower_count"`
	FollowingCount    int               `json:"following_count"`
	Verifications     []string          `json:"verifications"`
	VerifiedAddresses VerifiedAddresses `json:"verified_addresses"`
	VerifiedAccounts  []VerifiedAccount `json:"verified_accounts"`
	PowerBadge        bool              `json:"power_badge"`
}

type Profile struct {
	Bio Bio `json:"bio"`
}

type Bio struct {
	Text string `json:"text"`
}

type VerifiedAddresses struct {
	EthAddresses []string `json:"eth_addresses"`
	SolAddresses []string `json:"sol_addresses"`
}

type VerifiedAccount struct {
	Platform string `json:"platform"`
	Username string `json:"username"`
}

type Embed struct {
	URL      string   `json:"url"`
	Metadata Metadata `json:"metadata"`
}

type Metadata struct {
	ContentType   string  `json:"content_type"`
	ContentLength *string `json:"content_length"`
	Status        string  `json:"_status"`
}

type Frame struct {
	Version          string   `json:"version"`
	Title            string   `json:"title"`
	Image            string   `json:"image"`
	ImageAspectRatio string   `json:"image_aspect_ratio"`
	Buttons          []Button `json:"buttons"`
	Input            struct{} `json:"input"`
	State            struct{} `json:"state"`
	PostURL          string   `json:"post_url"`
	FramesURL        string   `json:"frames_url"`
}

type Button struct {
	Index      int    `json:"index"`
	Title      string `json:"title"`
	ActionType string `json:"action_type"`
	Target     string `json:"target"`
}

type Reactions struct {
	LikesCount   int                `json:"likes_count"`
	RecastsCount int                `json:"recasts_count"`
	Likes        []CastReactionUser `json:"likes"`
	Recasts      []CastReactionUser `json:"recasts"`
}

type CastReactionUser struct {
	FID   int    `json:"fid"`
	Fname string `json:"fname"`
}

type Replies struct {
	Count int `json:"count"`
}

type Channel struct {
	Object   string `json:"object"`
	ID       string `json:"id"`
	Name     string `json:"name"`
	ImageURL string `json:"image_url"`
}

type ChannelContext struct {
	Role      string `json:"role"`
	Following bool   `json:"following"`
}

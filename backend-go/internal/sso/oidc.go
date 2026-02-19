package sso

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// OIDCClient handles OpenID Connect authentication flows.
type OIDCClient struct {
	client *http.Client
}

// NewOIDCClient creates an OIDC client.
func NewOIDCClient() *OIDCClient {
	return &OIDCClient{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// AuthorizationURL builds the OIDC authorization redirect URL.
func (c *OIDCClient) AuthorizationURL(ssoURL, clientID, callbackURL, state string) string {
	params := url.Values{
		"response_type": {"code"},
		"client_id":     {clientID},
		"redirect_uri":  {callbackURL},
		"scope":         {"openid email profile"},
		"state":         {state},
	}
	return ssoURL + "?" + params.Encode()
}

// OIDCTokenResponse is the response from the token endpoint.
type OIDCTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	IDToken      string `json:"id_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// ExchangeCode exchanges an authorization code for tokens.
func (c *OIDCClient) ExchangeCode(tokenURL, clientID, clientSecret, code, callbackURL string) (*OIDCTokenResponse, error) {
	data := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {callbackURL},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
	}

	resp, err := c.client.Post(tokenURL, "application/x-www-form-urlencoded", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("token exchange failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("token endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp OIDCTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}

	return &tokenResp, nil
}

// OIDCUserInfo is the response from the userinfo endpoint.
type OIDCUserInfo struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

// GetUserInfo fetches user information from the OIDC userinfo endpoint.
func (c *OIDCClient) GetUserInfo(userInfoURL, accessToken string) (*OIDCUserInfo, error) {
	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("userinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("userinfo endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var info OIDCUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("failed to parse userinfo: %w", err)
	}

	return &info, nil
}

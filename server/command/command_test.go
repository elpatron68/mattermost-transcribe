package command

import (
	"testing"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin/plugintest"
	"github.com/mattermost/mattermost/server/public/pluginapi"
	"github.com/stretchr/testify/assert"
)

type env struct {
	client *pluginapi.Client
	api    *plugintest.API
}

func setupTest() *env {
	api := &plugintest.API{}
	driver := &plugintest.Driver{}
	client := pluginapi.NewClient(api, driver)

	return &env{
		client: client,
		api:    api,
	}
}

func TestTranscribeCommand(t *testing.T) {
	assert := assert.New(t)
	env := setupTest()

	env.api.On("RegisterCommand", &model.Command{
		Trigger:          transcribeCommandTrigger,
		AutoComplete:     true,
		AutoCompleteDesc: "Record audio and post a transcription",
		AutoCompleteHint: "",
		AutocompleteData: model.NewAutocompleteData("transcribe", "", "Record audio and post a transcription"),
	}).Return(nil)
	cmdHandler := NewCommandHandler(env.client)

	args := &model.CommandArgs{
		Command: "/transcribe",
	}
	response, err := cmdHandler.Handle(args)
	assert.Nil(err)
	assert.Equal(model.CommandResponseTypeEphemeral, response.ResponseType)
	assert.Contains(response.Text, "microphone button")
}

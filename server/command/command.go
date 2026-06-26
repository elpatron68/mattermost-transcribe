package command

import (
	"fmt"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/pluginapi"
)

type Handler struct {
	client *pluginapi.Client
}

type Command interface {
	Handle(args *model.CommandArgs) (*model.CommandResponse, error)
}

const transcribeCommandTrigger = "transcribe"

func NewCommandHandler(client *pluginapi.Client) Command {
	err := client.SlashCommand.Register(&model.Command{
		Trigger:          transcribeCommandTrigger,
		AutoComplete:     true,
		AutoCompleteDesc: "Record audio and post a transcription",
		AutoCompleteHint: "",
		AutocompleteData: model.NewAutocompleteData(transcribeCommandTrigger, "", "Record audio and post a transcription"),
	})
	if err != nil {
		client.Log.Error("Failed to register command", "error", err)
	}
	return &Handler{
		client: client,
	}
}

func (c *Handler) Handle(args *model.CommandArgs) (*model.CommandResponse, error) {
	fields := strings.Fields(args.Command)
	if len(fields) == 0 {
		return &model.CommandResponse{
			ResponseType: model.CommandResponseTypeEphemeral,
			Text:         "Empty command",
		}, nil
	}

	trigger := strings.TrimPrefix(fields[0], "/")
	if trigger != transcribeCommandTrigger {
		return &model.CommandResponse{
			ResponseType: model.CommandResponseTypeEphemeral,
			Text:         fmt.Sprintf("Unknown command: %s", args.Command),
		}, nil
	}

	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeEphemeral,
		Text:         "Use the microphone button in the message input to start recording.",
	}, nil
}

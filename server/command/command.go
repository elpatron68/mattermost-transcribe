package command

import (
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/pluginapi"
	"github.com/mattermost/mattermost/server/public/pluginapi/i18n"
)

type Handler struct {
	client *pluginapi.Client
	i18n   *i18n.Bundle
}

type Command interface {
	Handle(args *model.CommandArgs) (*model.CommandResponse, error)
}

const transcribeCommandTrigger = "transcribe"

func NewCommandHandler(client *pluginapi.Client, bundle *i18n.Bundle) Command {
	autoCompleteDesc := "Record audio and post a transcription"
	if bundle != nil {
		l := bundle.GetServerLocalizer()
		autoCompleteDesc = bundle.LocalizeDefaultMessage(l, &i18n.Message{
			ID:    "transcribe.command.autocomplete_desc",
			Other: autoCompleteDesc,
		})
	}

	err := client.SlashCommand.Register(&model.Command{
		Trigger:          transcribeCommandTrigger,
		AutoComplete:     true,
		AutoCompleteDesc: autoCompleteDesc,
		AutoCompleteHint: "",
		AutocompleteData: model.NewAutocompleteData(transcribeCommandTrigger, "", autoCompleteDesc),
	})
	if err != nil {
		client.Log.Error("Failed to register command", "error", err)
	}
	return &Handler{
		client: client,
		i18n:   bundle,
	}
}

func (c *Handler) Handle(args *model.CommandArgs) (*model.CommandResponse, error) {
	fields := strings.Fields(args.Command)
	if len(fields) == 0 {
		return &model.CommandResponse{
			ResponseType: model.CommandResponseTypeEphemeral,
			Text: c.localizeForUser(args.UserId, &i18n.Message{
				ID:    "transcribe.command.empty",
				Other: "Empty command",
			}),
		}, nil
	}

	trigger := strings.TrimPrefix(fields[0], "/")
	if trigger != transcribeCommandTrigger {
		return &model.CommandResponse{
			ResponseType: model.CommandResponseTypeEphemeral,
			Text: c.localizeForUserWithData(args.UserId, &i18n.Message{
				ID:    "transcribe.command.unknown",
				Other: "Unknown command: {{.Command}}",
			}, map[string]any{
				"Command": args.Command,
			}),
		}, nil
	}

	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeEphemeral,
		Text: c.localizeForUser(args.UserId, &i18n.Message{
			ID:    "transcribe.command.ephemeral_hint",
			Other: "Use the microphone button in the message input to start recording.",
		}),
	}, nil
}

func (c *Handler) localizeForUser(userID string, message *i18n.Message) string {
	if c.i18n == nil {
		return message.Other
	}

	l := c.i18n.GetUserLocalizer(userID)
	return c.i18n.LocalizeDefaultMessage(l, message)
}

func (c *Handler) localizeForUserWithData(userID string, message *i18n.Message, data map[string]any) string {
	if c.i18n == nil {
		text := message.Other
		if command, ok := data["Command"].(string); ok {
			text = strings.ReplaceAll(text, "{{.Command}}", command)
		}
		return text
	}

	l := c.i18n.GetUserLocalizer(userID)
	return c.i18n.LocalizeWithConfig(l, &i18n.LocalizeConfig{
		DefaultMessage: message,
		TemplateData:   data,
	})
}

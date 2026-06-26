package main

import (
	"net/http"
	"path/filepath"
	"sync"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/pluginapi"
	"github.com/mattermost/mattermost/server/public/pluginapi/i18n"

	"github.com/medisoftware/mattermost-transcribe/server/command"
)

type Plugin struct {
	plugin.MattermostPlugin

	client *pluginapi.Client

	commandClient command.Command

	i18nBundle *i18n.Bundle

	router *mux.Router

	configurationLock sync.RWMutex

	configuration *configuration
}

func (p *Plugin) OnActivate() error {
	p.client = pluginapi.NewClient(p.API, p.Driver)

	i18nBundle, err := i18n.InitBundle(p.API, filepath.Join("assets", "i18n"))
	if err != nil {
		return err
	}
	p.i18nBundle = i18nBundle

	p.commandClient = command.NewCommandHandler(p.client, p.i18nBundle)
	p.router = p.initRouter()

	return nil
}

func (p *Plugin) ExecuteCommand(_ *plugin.Context, args *model.CommandArgs) (*model.CommandResponse, *model.AppError) {
	response, err := p.commandClient.Handle(args)
	if err != nil {
		return nil, model.NewAppError("ExecuteCommand", "plugin.command.execute_command.app_error", nil, err.Error(), http.StatusInternalServerError)
	}
	return response, nil
}

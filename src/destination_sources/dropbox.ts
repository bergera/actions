import { Destination } from "../destination";
import { DestinationSource } from "../destination_source";
import { DataActionResponse } from "../data_action_response";
import { DataActionRequest} from "../data_action_request";
import { DataActionForm, DataActionFormField } from "../data_action_form";

import Dropbox = require("dropbox");
import * as sanitizeFilename from "sanitize-filename";

export class DropboxSource extends DestinationSource {

  async sourcedDestinations() {

    let dest = new Destination();
    dest.id = "dropbox";
    dest.label = "Dropbox";

    dest.action = async function(request) {

      let dropboxClient = dropboxClientFromRequest(request);

      if (request.type != "query") {
        throw "Only query actions are supported.";
      }

      if (request.attachment && request.attachment.fileExtension) {

        var fileTitle : string;
        if (request.title) {
          fileTitle = sanitizeFilename(request.title) + "." + request.attachment.fileExtension;
        } else {
          fileTitle = sanitizeFilename(`looker_file_${Date.now()}` + "." + request.attachment.fileExtension);
        }

        var uploadResponse = await dropboxClient.filesUpload({
          path: `/${fileTitle}`,
          contents: request.attachment.dataBuffer,
        });

      } else {
        throw "No attachment provided.";
      }

      return new DataActionResponse();
    }

    dest.form = async function(request) {

      let dropboxClient = dropboxClientFromRequest(request);

      var files = await dropboxClient.filesListFolder({path: ""});
      var folders = files.entries.filter((file: any) => {
        return file[".tag"] == "folder";
      });

      let form = new DataActionForm();
      form.fields = [{
        type: "select",
        label: "Folder",
        name: "path",
        required: true,
        options: folders.map((f : any) => { return {name: f.path_lower, label: f.path_display}}),
      }, {
        label: "Filename",
        name: "filename",
        description: "Leave blank to use a suggested filename including the date and time.",
      }];

      return form;
    }

    return [dest];
  }

}

function dropboxClientFromRequest(request : DataActionRequest) {
  if (!request.params) {
    throw "No params provided.";
  }

  let accessToken = request.params["dropbox_access_token"];

  if (!accessToken) {
    throw "No dropbox_access_token provided.";
  }

  return new Dropbox({
    accessToken: accessToken,
  });
}

import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { FileService } from '../service/file.service';
import { FileMoveDTO, IFile } from 'src/model/file';
import {MatDialog, MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import { ModifyDataDialogComponent } from '../modify-data-dialog/modify-data-dialog.component';
import { AddFriendDialogComponent } from '../add-friend-dialog/add-friend-dialog.component';
import { CognitoService } from '../service/cognito.service';
import { ShareDataDialogComponent } from '../share-data-dialog/share-data-dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css']
})
export class MainPageComponent {

  allDocs : IFile[] = []
  filteredDocs : IFile[] = []
  tempDocs: IFile[] = []
  isBackButtonDisabled = true
  showDiv = false
  showInvitations = false;
  isFileMode = true
  readOnly = false;
  selfContent = true;
  currentPath : string = (localStorage.getItem('username') ?? '') + "/"
  familyPath : string = (sessionStorage.getItem("familyUsername") ?? '') + "/";

  constructor(private cognitoService: CognitoService, private router: Router, private fileService: FileService, 
    public dialog: MatDialog, private clipboard: Clipboard) {

    const username = sessionStorage.getItem("familyUsername");
    if(username != null){
      // this.readOnly = true;
      fileService.getAll(this.familyPath).subscribe((res) => {
        this.tempDocs = this.sortedList(res);
        console.log(this.tempDocs.length);
      })
    }

    fileService.getAll(this.currentPath).subscribe((res) => { 
      this.allDocs = this.sortedList(res)
      this.pathFileterList()
    });
  }

  getSharedContent(){
    
    this.selfContent = false;
    let temp = this.allDocs;
    this.allDocs = this.tempDocs;
    this.tempDocs = temp;

    this.pathFileterList();
    this.isBackButtonDisabled = false;
    
  }

  //list manipulations
  pathFileterList() {
    if(!this.selfContent){
      this.filteredDocs = []
      for(var i = 0; i < this.allDocs.length; i++) {
        var currDoc : IFile = this.allDocs[i];
        if(currDoc.name.startsWith(this.familyPath)){
          var parts = currDoc.name.replace(this.familyPath, '').split('/')
          if(parts.length == 1){ this.filteredDocs.push(currDoc);}
        }
      }
      return;
    }
    this.filteredDocs = []
    for(var i = 0; i < this.allDocs.length; i++) {
      var currDoc : IFile = this.allDocs[i];
      if(currDoc.name.startsWith(this.currentPath)){
        var parts = currDoc.name.replace(this.currentPath, '').split('/')
        if(parts.length == 1) this.filteredDocs.push(currDoc)
      }
    }
  }

  sortedList(docs: IFile[]) {
    return docs.sort((a, b) => {
      const dateA = a.lastModifyDate ? new Date(a.lastModifyDate) : null
      const dateB = b.lastModifyDate ? new Date(b.lastModifyDate) : null
      if (dateA && dateB) return dateB.getTime() - dateA.getTime()
      else if (dateA) return 1
      else if (dateB) return -1
      return 0
    });
  }

  //show folder
  openFolder(file: IFile) {
    if(!this.selfContent){
      this.familyPath = file.name + "/";
      this.pathFileterList();
      this.isBackButtonDisabled = false;
      return;
    }
    this.currentPath = file.name + '/'
    this.pathFileterList()
    this.isBackButtonDisabled = false
  }

  closeFolder() {
    if(!this.selfContent){
      var parts = this.familyPath.split('/')
      var newPath : string = ''
      for(var i = 0; i < parts.length - 2; i++) newPath += parts[i] + '/'
      this.familyPath = newPath
      this.pathFileterList()
      if(this.familyPath.split('/').length == 1){
        
        this.familyPath = (sessionStorage.getItem("familyUsername") ?? '') + "/";
        const temp = this.allDocs;
        this.allDocs = this.tempDocs;
        this.tempDocs = temp;
        
        this.selfContent = true;
        this.isBackButtonDisabled = true;
        this.pathFileterList();
        
      }
      return;
    }
    var parts = this.currentPath.split('/')
    var newPath : string = ''
    for(var i = 0; i < parts.length - 2; i++) newPath += parts[i] + '/'
    this.currentPath = newPath
    this.pathFileterList()
    if(this.currentPath.split('/').length == 2) this.isBackButtonDisabled = true
  }

  //create
  whenCreatedNewDoc(item: IFile) {
    this.allDocs.unshift(item)
    this.allDocs = this.sortedList(this.allDocs)
    this.pathFileterList()
  }

  //delete
  delete(file: IFile) {
    this.fileService.delete(file.id, file.name, file.isFolder).subscribe((res) => { 
      console.log(res);
      
      const items = file.name.split('/');
      const lastItem = items[items.length - 1];
      this.fileService.sendNotification(localStorage.getItem('email')!, lastItem + " - Successfully Deleted").subscribe(
        {next: (res) => console.log(res)});
      const index = this.allDocs.indexOf(file)
      if (index !== -1)  this.allDocs.splice(index, 1)
      this.pathFileterList()
    })
  }

  inviteFriend(): void {
    const dialogRef = this.dialog.open(AddFriendDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog result:', result);
    });
  }

  download(file: IFile) {
    console.log("123");
    console.log(file.name);
    console.log(file.id);
    this.fileService.download(file.name).subscribe((res) => {
      const items = file.name.split('/');
      const lastItem = items[items.length - 1];
      this._download(res.value, lastItem, this.getMimeType('.' + file.type))
    }, (error) => {
      console.log(error);
    });
  }

  _download(res: any, fn: string, extension: string) {
    let data = this.base64ToFile(res, fn, extension);
    let element = document.createElement('a');
    window.URL = window.URL || window.webkitURL;
    element.setAttribute('href', window.URL.createObjectURL(data));
    element.setAttribute('download', data.name);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
  
  base64ToFile(base64data: string, myFileNameWithdotExtension: string, fileType: string): File {
    const content = window.atob(base64data);
    const fileName = myFileNameWithdotExtension;
    const type = fileType;
    const uint8Array = new Uint8Array(content.length);
    
    for (let i = 0; i < content.length; i++) {
      uint8Array[i] = content.charCodeAt(i);
    }
    
    const blob = new Blob([uint8Array], { type });
    return new File([blob], fileName, { lastModified: new Date().getTime(), type });
  }

  share(file: IFile) {
    const dialogRef = this.dialog.open(ShareDataDialogComponent);
    // Subscribe to the dialogClosed event
    dialogRef.componentInstance.dialogClosed.subscribe(to => {
      console.log('Dialog result:', to);
      if(to == null) {
        return;
      } else if (to == "clipboard") {
        this.fileService.shareFF(file, "copy").subscribe((res) => {
          console.log(res);
          if (res.link) {
            this.clipboard.copy(res.link);
            alert("Link copied to clipboard")
          }
        }, (err) => {
          console.log(err);
          alert("Failed to share the file");
        })
      } else {
        this.fileService.shareFF(file, to).subscribe((res) => {
          alert("Successfully shared");
        }, (err) => {
          alert("Error while trying to share data.")
        });
      }
    });
  }

  modify(file: IFile){
    const dialogRef = this.dialog.open(ModifyDataDialogComponent, {
      data: file
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog result:', result);
    });
  }

  //move
  openMoveDialog(file: IFile): void {
    const dialogRef = this.dialog.open(MoveDialog, { data: { directories: this.getAvailableFolders(file) } });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        var parts = file.name.split('/')
        var fileMove: FileMoveDTO = {id: file.id, name: result + '/' + parts[parts.length - 1]}
        console.log(fileMove)
        this.fileService.move(fileMove).subscribe((res) => { 
          console.log(res)
          const index = this.allDocs.indexOf(file)
          if (index !== -1)  this.allDocs.splice(index, 1)
          file.name = fileMove.name
          this.allDocs.push(file)
          this.pathFileterList()
        })
      }
    });
  }

  getAvailableFolders(file: IFile) {
    var goodDirectories: string[] = [] 
    for(var i = 0; i < this.allDocs.length; i++) {
      var currDoc = this.allDocs[i]
      if(currDoc.isFolder && !this.isNameAlreadyExist(file.name, currDoc.name)) goodDirectories.push(currDoc.name) 
    }
    var root: string = localStorage.getItem('username') ?? ''
    if(!this.isNameAlreadyExist(file.name, root)) goodDirectories.push(root)
    return goodDirectories
  }

  isNameAlreadyExist(docName: string, folderName: string) {
    var fileParts = docName.split('/')
    var newName = folderName + '/' + fileParts[fileParts.length - 1]
    for(var i in this.allDocs) if(this.allDocs[i].name == newName) return true
    return false
  }

  //logout
  logout() {
    this.cognitoService.signOut();
    this.router.navigate(['/'])
  }

  //helpers
  toggleDiv(isFile: boolean): void {
    this.showDiv = true
    this.showInvitations = false;
    if(isFile) this.isFileMode = true
    else this.isFileMode = false
  }

  seeFamily(){
    this.showInvitations = true;
    this.showDiv = false;
  }

  getForrmatedCurrentPath() {
    if(!this.selfContent){
      const parts = this.familyPath.split('/')
      var path = 'Family'
      for(var i = 1; i < parts.length; i++) path += ' > ' + parts[i] 
      return path.slice(0, path.length - 2)
    }
    const parts = this.currentPath.split('/')
    var path = 'Root'
    for(var i = 1; i < parts.length; i++) path += ' > ' + parts[i] 
    return path.slice(0, path.length - 2)
  }

  getName(file: IFile) {
    const parts = file.name.split('/')
    if (file.isFolder) return parts[parts.length - 1]
    return parts[parts.length - 1] + '.' + file.type
  }

  getMimeType(fileExtension: string): string {
    const mimeTypeMap: Record<string, string> = {
      // Add more extensions and corresponding MIME types as needed
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
    };
    return mimeTypeMap[fileExtension.toLowerCase()];
  }
}

@Component({
  selector: 'reject-dialog',
  templateUrl: 'move-dialog.html',
})
export class MoveDialog {
  selectedDirectory: string = ''
  directories: string[] = []

  constructor(
    public dialogRef: MatDialogRef<MoveDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.directories = data.directories
    this.selectedDirectory = data.directories[0]
  }

  onNoClick(): void {
    this.dialogRef.close()
  }

  onYesClick() {
    this.dialogRef.close(this.selectedDirectory)
  }

  getFormatedName(name: string) {
    var root: string = localStorage.getItem('username') ?? ''
    return name.replace(root, 'Root')
  }
}